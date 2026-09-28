"""解説ページの本文の検証ツール。
  07_タイプ解説.json・08_星座解説.json・09_読みもの*.json（09_読みもの.json、09_読みもの_b.json …）、
  12_用語集.json・10_図鑑.json・11_相性早見表.json（D-019）

使い方: python3 tools/validate_articles.py
  文字数（見出し＋本文、空白・改行を除く）と禁止語を調べる。
  用語集・図鑑・相性早見表は、形式（必要な項目、slug、件数）と禁止語を調べる（まだファイルが無ければ WARN）。
  ERROR が1件でもあれば終了コード1。WARN は人が確認する（0件を目標にする）。
禁止語は validate_combinations.py と同じもの（法務判断書・表現ガイドライン）に、
16Personalities・LoveType16 の名称などを加えている。
"""

import json
import re
import sys
from pathlib import Path

from validate_combinations import ERROR_PATTERNS as BASE_ERRORS, SIGNS, TYPES, WARN_PATTERNS as BASE_WARNS

# 文章データのディレクトリ（本番は 02_content/。公開用リポジトリではダミーの sample-data/）
BASE = Path(__file__).resolve().parent.parent / "sample-data"

TYPE_LENGTH = (1300, 1700)
SIGN_LENGTH = (1300, 1700)
COLUMN_LENGTH = (1500, 2500)
SECTIONS = (4, 5)

ERROR_PATTERNS = BASE_ERRORS + [
    (r"16Personalities|16 Personalities|LoveType|ラブタイプ|マイヤーズ", "他サービス名"),
    (r"建築家|論理学者|指揮官|討論者|提唱者|仲介者|主人公|運動家|管理者|擁護者|幹部|領事|巨匠|冒険家|起業家|エンターテイナー",
     "16Personalitiesのタイプ名と同じ語"),
    (r"ボス猫|隠れベイビー|主役体質|ツンデレヤンキー|憧れの先輩|カリスマバランサー|パーフェクトカメレオン|キャプテンライオン|"
     r"ロマンスマジシャン|ちゃっかりうさぎ|恋愛モンスター|忠犬ハチ公|不思議生命体|敏腕マネージャー|デビル天使|最後の恋人",
     "LoveType16のタイプ名"),
    (r"[A-Za-z]{4}型|[EI]型|[SN]型|[TF]型|[JP]型", "アルファベットの型表記"),
]
# validate_combinations.py の WARN から、ERROR に上げた16Personalitiesの語を除く
WARN_PATTERNS = [(p, l) for p, l in BASE_WARNS if "16Personalities" not in l] + [
    (r"すべて当て|当たります|間違いなく", "断定的な表現（文脈を確認）"),
]


def length(sections: list[dict]) -> int:
    return sum(len(re.sub(r"\s", "", s.get("heading", "") + s.get("body", ""))) for s in sections)


def check_sections(where: str, sections, lo_hi, errors: list[str], warns: list[str], counts: list, sec_range=None) -> None:
    if not isinstance(sections, list) or not sections:
        errors.append(f"{where}: sections がない")
        return
    for i, s in enumerate(sections):
        if not isinstance(s, dict) or not s.get("heading") or not s.get("body"):
            errors.append(f"{where}: sections[{i}] に heading / body がない")
            continue
        text = s["heading"] + "\n" + s["body"]
        for pattern, label in ERROR_PATTERNS:
            for m in re.finditer(pattern, text):
                errors.append(f"{where} 「{s['heading']}」: {label}「{m.group(0)}」")
        for pattern, label in WARN_PATTERNS:
            for m in re.finditer(pattern, text):
                warns.append(f"{where} 「{s['heading']}」: {label}「{m.group(0)}」")
    n = length(sections)
    counts.append((where, n, len(sections)))
    lo, hi = lo_hi
    if not lo <= n <= hi:
        errors.append(f"{where}: 文字数 {n}（{lo}〜{hi}）")
    if sec_range and not sec_range[0] <= len(sections) <= sec_range[1]:
        errors.append(f"{where}: 見出しの数 {len(sections)}（{sec_range[0]}〜{sec_range[1]}）")


def check_text(where: str, text: str, errors: list[str], warns: list[str]) -> None:
    """文字列の禁止語チェック（用語集・図鑑・相性早見表・タイトルなど）"""
    for pattern, label in ERROR_PATTERNS:
        for m in re.finditer(pattern, text):
            errors.append(f"{where}: {label}「{m.group(0)}」")
    for pattern, label in WARN_PATTERNS:
        for m in re.finditer(pattern, text):
            warns.append(f"{where}: {label}「{m.group(0)}」")


def type_order() -> list[str]:
    """06_キャラクター.json の並び順（相性早見表の a・b の順の確認に使う）"""
    try:
        data = json.loads((BASE / "06_キャラクター.json").read_text(encoding="utf-8"))
        order = [c["slug"] for c in data["characters"]]
        if set(order) == TYPES:
            return order
    except (OSError, ValueError, KeyError, TypeError):
        pass
    return sorted(TYPES)


def load(name: str, errors: list[str], optional: list[str] | None = None):
    """optional を渡すと、ファイルが無いときは ERROR ではなくそこ（WARN）に積む（制作中のファイル）"""
    path = BASE / name
    if not path.exists():
        (optional if optional is not None else errors).append(f"{name} がない")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errors.append(f"{name}: JSONの形式が不正 ({e})")
        return None


def check_glossary(column_slugs: set[str], errors: list[str], warns: list[str]) -> None:
    name = "12_用語集.json"
    data = load(name, errors, warns)
    if data is None:
        return
    terms = data.get("terms") if isinstance(data, dict) else None
    if not isinstance(terms, list) or not terms:
        errors.append(f"{name}: terms が配列ではない（空）")
        return
    seen: set[str] = set()
    for i, t in enumerate(terms):
        if not isinstance(t, dict) or not t.get("term") or not t.get("body"):
            errors.append(f"{name}: terms[{i}] に term / body がない")
            continue
        where = f"glossary/{t['term']}"
        if t["term"] in seen:
            errors.append(f"{where}: 用語が重複している")
        seen.add(t["term"])
        if not re.fullmatch(r"[ぁ-んァ-ヶー・ ]+", t.get("reading") or ""):
            errors.append(f"{where}: reading がない（ひらがな・カタカナで書く）")
        related = t.get("related", [])
        if not isinstance(related, list):
            errors.append(f"{where}: related が配列ではない")
            related = []
        for r in related:
            if r not in column_slugs:
                errors.append(f"{where}: related の「{r}」という読みものが無い")
        check_text(where, t["term"] + "\n" + t["body"], errors, warns)
    print(f"{name}: {len(terms)} 語")


ZUKAN_TEXT_FIELDS = ("habitat", "kuchiguse", "recovery", "trivia")


def check_zukan(errors: list[str], warns: list[str]) -> None:
    name = "10_図鑑.json"
    data = load(name, errors, warns)
    if data is None:
        return
    if not isinstance(data, dict):
        errors.append(f"{name}: オブジェクトではない")
        return
    keys = {k for k in data if not k.startswith("_")}
    if keys != TYPES:
        errors.append(f"{name}: slug が16タイプと一致しない（不足 {TYPES - keys}、不明 {keys - TYPES}）")
    for slug in sorted(keys & TYPES):
        e = data[slug]
        where = f"zukan/{slug}"
        if not isinstance(e, dict):
            errors.append(f"{where}: オブジェクトではない")
            continue
        texts = []
        for f in ZUKAN_TEXT_FIELDS:
            if not isinstance(e.get(f), str) or not e[f].strip():
                errors.append(f"{where}: {f} がない")
            else:
                texts.append(e[f])
        for f in ("likes", "dislikes"):
            v = e.get(f)
            if not isinstance(v, list) or len(v) != 3 or not all(isinstance(x, str) and x.strip() for x in v):
                errors.append(f"{where}: {f} は文字列3つ")
            else:
                texts.extend(v)
        b = e.get("buddy")
        if not isinstance(b, dict) or b.get("slug") not in TYPES or b.get("slug") == slug:
            errors.append(f"{where}: buddy.slug が不正（自分以外の16タイプの slug）")
        elif not b.get("reason"):
            errors.append(f"{where}: buddy.reason がない")
        else:
            texts.append(b["reason"])
        check_text(where, "\n".join(texts), errors, warns)
    print(f"{name}: {len(keys & TYPES)}/16 体")


def check_aisho(errors: list[str], warns: list[str]) -> None:
    name = "11_相性早見表.json"
    data = load(name, errors, warns)
    if data is None:
        return
    if not isinstance(data, dict) or not isinstance(data.get("labels"), dict) or not isinstance(data.get("pairs"), list):
        errors.append(f"{name}: {{labels: {{}}, pairs: []}} の形ではない")
        return
    for key, l in data["labels"].items():
        if not isinstance(l, dict) or not all(isinstance(l.get(f), str) and l[f].strip() for f in ("name", "icon", "description")):
            errors.append(f"{name}: labels.{key} に name / icon / description がない")
            continue
        check_text(f"aisho/label/{key}", l["name"] + "\n" + l["description"], errors, warns)
    order = {s: i for i, s in enumerate(type_order())}
    seen: set[tuple[str, str]] = set()
    for i, p in enumerate(data["pairs"]):
        if not isinstance(p, dict):
            errors.append(f"{name}: pairs[{i}] がオブジェクトではない")
            continue
        a, b = p.get("a"), p.get("b")
        where = f"aisho/{a}×{b}"
        if a not in order or b not in order:
            errors.append(f"{where}: a / b が16タイプの slug ではない")
            continue
        if order[a] > order[b]:
            errors.append(f"{where}: a は 06_キャラクター.json の並びで先のほうにする")
        key = tuple(sorted((a, b), key=order.get))
        if key in seen:
            errors.append(f"{where}: ペアが重複している")
        seen.add(key)
        if p.get("label") not in data["labels"]:
            errors.append(f"{where}: label「{p.get('label')}」が labels に無い")
        if not isinstance(p.get("text"), str) or not p["text"].strip():
            errors.append(f"{where}: text がない")
        else:
            check_text(where, p["text"], errors, warns)
    expected = len(order) * (len(order) + 1) // 2
    if len(seen) != expected:
        errors.append(f"{name}: ペアが {len(seen)}/{expected} 組")
    print(f"{name}: ラベル {len(data['labels'])} 種、{len(seen)}/{expected} 組")


def main() -> int:
    errors: list[str] = []
    warns: list[str] = []
    counts: list = []

    types = load("07_タイプ解説.json", errors)
    if types is not None:
        keys = {k for k in types if not k.startswith("_")}
        if keys != TYPES:
            errors.append(f"07_タイプ解説.json: slug が16タイプと一致しない（不足 {TYPES - keys}、不明 {keys - TYPES}）")
        for slug in sorted(keys & TYPES):
            check_sections(f"type/{slug}", types[slug].get("sections"), TYPE_LENGTH, errors, warns, counts, SECTIONS)

    signs = load("08_星座解説.json", errors)
    if signs is not None:
        keys = {k for k in signs if not k.startswith("_")}
        if keys != set(SIGNS):
            errors.append(f"08_星座解説.json: signId が12星座と一致しない（不足 {set(SIGNS) - keys}、不明 {keys - set(SIGNS)}）")
        for sid in [s for s in SIGNS if s in keys]:
            check_sections(f"sign/{sid}", signs[sid].get("sections"), SIGN_LENGTH, errors, warns, counts, SECTIONS)

    column_files = sorted((p.name for p in BASE.glob("09_読みもの*.json")), key=lambda n: (len(n), n))
    if not column_files:
        errors.append("09_読みもの.json がない")
    column_slugs: dict[str, str] = {}
    for name in column_files:
        columns = load(name, errors)
        if columns is None:
            continue
        if not isinstance(columns, list):
            errors.append(f"{name}: 配列ではない")
            continue
        for c in columns:
            if not isinstance(c, dict):
                errors.append(f"{name}: 記事がオブジェクトではない")
                continue
            where = f"column/{c.get('slug')}"
            slug = c.get("slug") or ""
            if slug in column_slugs:
                errors.append(f"{where}: slug が重複している（{column_slugs[slug]} と {name}）")
            column_slugs[slug] = name
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
                errors.append(f"{where}: slug が不正")
            for field in ("title", "description"):
                if not c.get(field):
                    errors.append(f"{where}: {field} がない")
                check_text(f"{where} {field}", c.get(field) or "", errors, warns)
            check_sections(where, c.get("sections"), COLUMN_LENGTH, errors, warns, counts)

    check_glossary(set(column_slugs), errors, warns)
    check_zukan(errors, warns)
    check_aisho(errors, warns)

    for where, n, k in counts:
        print(f"{where:28s} {n:5d}字  見出し{k}")
    for e in errors:
        print(f"ERROR {e}")
    for w in warns:
        print(f"WARN  {w}")
    print(f"-- ERROR {len(errors)} / WARN {len(warns)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    sys.exit(main())

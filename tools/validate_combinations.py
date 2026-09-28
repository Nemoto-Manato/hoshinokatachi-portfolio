"""組み合わせ文言（02_content/combinations/*.json）の検証ツール。

使い方: python3 tools/validate_combinations.py [ファイル...]
  引数なしなら combinations/ 以下のすべてのJSONを検証する。
  ERROR が1件でもあれば終了コード1。WARN は人が確認する。
"""

import json
import re
import sys
from pathlib import Path

TYPES = {
    "polaris", "nebula", "sun", "uranus", "neptune", "milky-way", "first-star", "comet",
    "saturn", "moon", "jupiter", "venus", "mercury", "aurora", "mars", "meteor-shower",
}
SIGNS = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]

# (最小, 最大) 文字数
LENGTHS = {
    "nickname": (4, 15),
    "hitokoto": (25, 45),
    "basic": (170, 240),
    "love": (210, 290),
    "work": (210, 290),
    "relationships": (160, 240),
    "growth": (110, 180),
}
REASON_LENGTH = (20, 50)

# 法務判断書 #1・#2、表現ガイドラインにもとづく
ERROR_PATTERNS = [
    (r"MBTI|マイヤーズ|Myers", "商標（MBTI）"),
    (r"(?<![A-Za-z])[EI][SN][TF][JP](?![A-Za-z])", "4文字コード（本文では使わない）"),
    (r"必ず当たる|絶対に当たる|絶対に幸せ|100%", "断定・保証"),
    (r"不幸が|厄が|呪い|バチが", "恐怖を煽る表現"),
    (r"病気|治る|寿命|妊娠|出産", "健康・医療・生命"),
    (r"投資|宝くじ|ギャンブル|儲か", "お金・投資"),
    (r"別れるべき|付き合うな|嫌われる", "決めつけ・否定"),
    # D-011：16タイプは「星のいきもの」に刷新。旧タイプ名（「〇〇タイプ」の形）は使わない。
    # 天体名そのもの（守護星としての「北極星」「太陽」など）は許可する。
    (r"(北極星|星雲|太陽|天王星|海王星|天の川|一番星|彗星|土星|月|木星|金星|水星|オーロラ|火星|流星群)タイプ",
     "旧タイプ名（キャラ名に置き換える。06_キャラクター.json）"),
]
WARN_PATTERNS = [
    (r"必ず|絶対", "断定的な表現（文脈を確認）"),
    (r"すべき|しなければ", "行動の強制（文脈を確認）"),
    (r"建築家|論理学者|指揮官|討論者|提唱者|仲介者|主人公|運動家|管理者|擁護者|幹部|領事|巨匠|冒険家|起業家|エンターテイナー",
     "16Personalitiesのタイプ名と同じ語（文脈を確認）"),
    (r"男|女|彼氏|彼女", "性別を前提にした表現（文脈を確認）"),
]


def check_text(where: str, text: str, errors: list[str], warns: list[str]) -> None:
    for pattern, label in ERROR_PATTERNS:
        m = re.search(pattern, text)
        if m:
            errors.append(f"{where}: {label}「{m.group(0)}」")
    for pattern, label in WARN_PATTERNS:
        m = re.search(pattern, text)
        if m:
            warns.append(f"{where}: {label}「{m.group(0)}」")


def validate(path: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warns: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return [f"{path.name}: JSONの形式が不正 ({e})"], []

    type_slug = data.get("type")
    if type_slug not in TYPES:
        errors.append(f"{path.name}: type が不正「{type_slug}」")
    if path.stem != type_slug:
        errors.append(f"{path.name}: ファイル名と type が一致しない")

    combos = data.get("combinations", [])
    signs = [c.get("sign") for c in combos]
    if sorted(signs, key=lambda s: SIGNS.index(s) if s in SIGNS else 99) != SIGNS or len(signs) != 12:
        errors.append(f"{path.name}: 12星座がちょうど1件ずつそろっていない（{signs}）")

    for c in combos:
        where = f"{path.name} {type_slug}×{c.get('sign')}"
        for field, (lo, hi) in LENGTHS.items():
            text = c.get(field)
            if not isinstance(text, str) or not text:
                errors.append(f"{where}: {field} がない")
                continue
            n = len(text)
            if not lo <= n <= hi:
                errors.append(f"{where}: {field} の文字数 {n}（{lo}〜{hi}）")
            check_text(f"{where} {field}", text, errors, warns)

        compat = c.get("compatible", [])
        if len(compat) != 3:
            errors.append(f"{where}: compatible が3件ではない")
        for i, m in enumerate(compat):
            if m.get("type") not in TYPES or m.get("sign") not in SIGNS:
                errors.append(f"{where}: compatible[{i}] のslugが不正（{m.get('type')}×{m.get('sign')}）")
            if m.get("type") == type_slug and m.get("sign") == c.get("sign"):
                errors.append(f"{where}: compatible[{i}] が自分自身")
            reason = m.get("reason", "")
            if not REASON_LENGTH[0] <= len(reason) <= REASON_LENGTH[1]:
                errors.append(f"{where}: compatible[{i}].reason の文字数 {len(reason)}（{REASON_LENGTH[0]}〜{REASON_LENGTH[1]}）")
            check_text(f"{where} compatible[{i}]", reason, errors, warns)
        if len({(m.get('type'), m.get('sign')) for m in compat}) != len(compat):
            errors.append(f"{where}: compatible に重複がある")

    return errors, warns


def main() -> int:
    base = Path(__file__).resolve().parent.parent / "sample-data" / "combinations"
    paths = [Path(a) for a in sys.argv[1:]] or sorted(base.glob("*.json"))
    total_errors = 0
    for path in paths:
        errors, warns = validate(path)
        total_errors += len(errors)
        for e in errors:
            print(f"ERROR {e}")
        for w in warns:
            print(f"WARN  {w}")
        print(f"-- {path.name}: ERROR {len(errors)} / WARN {len(warns)}")
    return 1 if total_errors else 0


if __name__ == "__main__":
    sys.exit(main())

"""太陽が各星座に入る日時（日本時間）の表を生成する。

太陽の黄経は Meeus『Astronomical Algorithms』の低精度式で計算する（誤差0.01度程度、時刻にして約15分）。
生成物: src/data/sun_ingress_jst.json（アプリから読み込む）
  {"1990": [["aries", "1990-03-21T06:19"], ...], ...}  # 各年、その年に始まる12星座の開始日時（JST）
"""

import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

SIGNS = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]
JST = timezone(timedelta(hours=9))
J2000 = datetime(2000, 1, 1, 12, tzinfo=timezone.utc)
# TT - UT（ΔT）はおおむね30〜70秒。星座判定の精度には影響しないので、固定値で近似する。
DELTA_T = timedelta(seconds=69)


def sun_longitude(dt_utc: datetime) -> float:
    """見かけの太陽黄経（度, 0〜360）。"""
    jd_offset = (dt_utc + DELTA_T - J2000).total_seconds() / 86400
    t = jd_offset / 36525
    l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
    m = math.radians(357.52911 + 35999.05029 * t - 0.0001537 * t * t)
    c = ((1.914602 - 0.004817 * t - 0.000014 * t * t) * math.sin(m)
         + (0.019993 - 0.000101 * t) * math.sin(2 * m)
         + 0.000289 * math.sin(3 * m))
    omega = math.radians(125.04 - 1934.136 * t)
    apparent = l0 + c - 0.00569 - 0.00478 * math.sin(omega)
    return apparent % 360


def angle_past(lon: float, target: float) -> float:
    """target から lon までの差（-180〜180）。正なら target を通過済み。"""
    return (lon - target + 180) % 360 - 180


def find_ingress(target: float, start: datetime) -> datetime:
    """start 以降で、太陽黄経が最初に target 度に達する時刻を二分探索で求める。"""
    lo = start
    hi = start + timedelta(days=1)
    while angle_past(sun_longitude(hi), target) < 0:
        lo, hi = hi, hi + timedelta(days=1)
    for _ in range(40):
        mid = lo + (hi - lo) / 2
        if angle_past(sun_longitude(mid), target) < 0:
            lo = mid
        else:
            hi = mid
    return hi


def ingresses_for_year(year: int) -> list[list[str]]:
    # 1月1日時点では、太陽はやぎ座（270度）にいる。その年最初の境目は、みずがめ座（300度）。
    result = []
    cursor = datetime(year, 1, 1, tzinfo=JST).astimezone(timezone.utc)
    for i in range(12):
        sign_index = (10 + i) % 12  # aquarius から始めて、1周してやぎ座まで
        at = find_ingress(sign_index * 30.0, cursor)
        result.append([SIGNS[sign_index], at.astimezone(JST).strftime("%Y-%m-%dT%H:%M")])
        cursor = at + timedelta(days=20)
    return result


def main() -> None:
    table = {str(y): ingresses_for_year(y) for y in range(1919, 2031)}
    out = Path(__file__).resolve().parent.parent / "src" / "data" / "sun_ingress_jst.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(table, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

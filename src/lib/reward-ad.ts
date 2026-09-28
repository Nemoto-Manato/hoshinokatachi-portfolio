// リワード広告（法務判断書 #3：Google公式のリワード広告に限る。AdSenseのオファーウォール、またはAd ManagerのWeb向けリワード広告）。
// ブラウザで動く。広告SDKを差し込むのは showRewardedAd() の中だけ。呼び出し側（components/RewardGate.astro）は変えなくてよい。

/**
 * リワード広告を表示し、報酬を与えてよい（最後まで視聴された）なら true を返す。
 * 途中で閉じられた・広告を読み込めなかったときの扱い（false にするか、そのまま見せるか）は、導入時に決める。
 *
 * ★ 広告SDKを差し込む場所 ★
 * 今は広告を入れていないので、すぐに true を返す（ボタンを押せば続きが読める仮の実装）。
 * 注意（AdSenseポリシー）：「広告をクリックすると表示」のように、クリックを条件にしてはいけない。
 */
export async function showRewardedAd(): Promise<boolean> {
  // TODO(広告): ここで広告SDKを呼び、視聴完了（報酬）のイベントを待って true を返す。
  return true;
}

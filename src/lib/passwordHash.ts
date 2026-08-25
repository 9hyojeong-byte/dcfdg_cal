// 백엔드가 없는 앱이라 비밀번호 대조는 브라우저에서 SHA-256 해시값을
// 비교하는 방식으로만 이루어진다. 진짜 보안이 필요한 값(계좌, 개인정보
// 등)에는 쓰지 말 것 — 아무나 지우거나 함부로 수정하는 걸 막는
// 가벼운 잠금장치 정도로만 사용한다.
export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

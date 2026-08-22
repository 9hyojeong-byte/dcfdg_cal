import React from 'react';

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s]+)/gi;
const TRAILING_PUNCTUATION_REGEX = /([),.!?~"'\]]+)$/;

// 텍스트 안에 있는 URL(http://, https://, www.)을 찾아 클릭 가능한 <a> 링크로 바꿔준다.
// 문장 끝에 붙은 문장부호(., ), 등)는 링크에서 제외하고 원래 텍스트로 남긴다.
export function linkifyText(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX);

  return parts.map((part, i) => {
    // split과 짝을 이루는 캡처 그룹이라 홀수 인덱스가 항상 매치된 URL이다.
    if (i % 2 !== 1) return part;

    let url = part;
    let trailing = '';
    const trailingMatch = url.match(TRAILING_PUNCTUATION_REGEX);
    if (trailingMatch) {
      trailing = trailingMatch[1];
      url = url.slice(0, -trailing.length);
    }

    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    return (
      <React.Fragment key={i}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[#8B5CF6] underline underline-offset-2 hover:text-[#7C3AED] break-all"
        >
          {url}
        </a>
        {trailing}
      </React.Fragment>
    );
  });
}

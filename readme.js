import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import Parser from 'rss-parser';

dotenv.config(); // .env 파일 로드

const README_PATH = 'README.md';
const RSS_FEED_URL = process.env.RSS_FEED_URL || 'https://blog.jh8459.com/rss';
const SECTION_HEADER = process.env.SECTION_HEADER || '## 📚 &#160;Blog Posts';
const INSERT_MARKER = process.env.INSERT_MARKER || '<br>\n\n---';

// 날짜 변환 함수: EX "Fri, 17 Jan 2025 00:00:00 GMT" → "2025/01/17"
function formatPubDate(pubDate) {
  try {
    const date = new Date(pubDate);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // 월(1~12)
    const day = String(date.getUTCDate()).padStart(2, '0'); // 일(01~31)

    return `${year}/${month}/${day}`;
  } catch (error) {
    console.error('날짜 변환 중 오류 발생:', error);
    return ''; // 오류 발생 시 빈 문자열 반환
  }
}

// RSS 피드에서 최신 블로그 글 목록을 가져오는 함수
async function fetchRecentPosts(feedUrl, limit = 5) {
  try {
    const parser = new Parser({ headers: { Accept: 'application/rss+xml, application/xml, text/xml; q=0.1' } });
    const feed = await parser.parseURL(feedUrl);

    return feed.items
      .slice(0, limit)
      .map(({ title, link, pubDate }) => {
        const formattedDate = formatPubDate(pubDate);
        return `- [${title}](${link}) - ${formattedDate}`;
      })
      .join('\n');
  } catch (error) {
    console.error('RSS 피드 파싱 중 오류 발생:', error);
    return ''; // 오류 발생 시 빈 문자열 반환
  }
}

// README.md 파일의 내용을 읽어오는 함수
function readReadme(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('README.md 파일을 읽는 중 오류 발생:', error);
    return ''; // 오류 발생 시 빈 문자열 반환
  }
}

// README.md 파일을 업데이트하는 함수
function updateReadme(filePath, newPosts) {
  if (!newPosts) return;

  let content = readReadme(filePath);

  if (content.includes(INSERT_MARKER)) {
    const sectionRegex = new RegExp(`${SECTION_HEADER}[\\s\\S]*?(?=\n${INSERT_MARKER})`, 'm');

    if (content.match(sectionRegex)) {
      // 기존 SECTION_HEADER가 존재하는 경우, 내용을 교체
      content = content.replace(sectionRegex, `${SECTION_HEADER}\n\n${newPosts}`);
    } else {
      // SECTION_HEADER가 존재하지 않는 경우, 새롭게 추가
      content = content.replace(INSERT_MARKER, `\n${SECTION_HEADER}\n\n${newPosts}\n${INSERT_MARKER}`);
    }

    try {
      writeFileSync(filePath, content, 'utf8');
      console.log('✅ README.md 업데이트 완료');
    } catch (error) {
      console.error('README.md 파일을 저장하는 중 오류 발생:', error);
    }
  } else {
    console.error('⚠️ README.md에서 삽입할 위치를 찾을 수 없습니다.');
  }
}

// 실행 함수
(async function main() {
  const recentPosts = await fetchRecentPosts(RSS_FEED_URL);
  updateReadme(README_PATH, recentPosts);
})();

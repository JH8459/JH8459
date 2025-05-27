import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import Parser from 'rss-parser';

dotenv.config(); // .env 파일 로드

const README_PATH = 'README.md';
const RSS_FEED_URL = process.env.RSS_FEED_URL || 'https://blog.jh8459.com/rss';
const SECTION_HEADER = process.env.SECTION_HEADER || '## 📚 Blog Posts';
const INSERT_MARKER = process.env.INSERT_MARKER || '---';

// 날짜 변환 함수: EX "Fri, 17 Jan 2025 00:00:00 GMT" → "2025/01/17"
function formatPubDate(pubDate) {
  try {
    const date = new Date(pubDate);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // 월(1~12)
    const day = String(date.getUTCDate()).padStart(2, '0'); // 일(01~31)

    return `${year}.${month}.${day}`;
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
  if (!newPosts) {
    console.log('⚠️ 업데이트할 새로운 포스트가 없습니다.');
    return;
  }

  let content = readReadme(filePath);

  // SECTION_HEADER를 정규식에서 안전하게 사용하기 위해 이스케이프 처리
  const escapedSectionHeader = SECTION_HEADER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // SECTION_HEADER부터 INSERT_MARKER(---)까지의 내용을 찾음
  const sectionRegex = new RegExp(`(${escapedSectionHeader})[\\s\\S]*?(?=\\n${INSERT_MARKER})`, 'm');

  const match = content.match(sectionRegex);

  if (match) {
    // 기존 Blog Posts 섹션이 존재하는 경우, 내용을 교체
    const replacement = `${SECTION_HEADER}\n${newPosts}`;
    content = content.replace(sectionRegex, replacement);

    console.log('✅ 기존 Blog Posts 섹션을 업데이트합니다.');
  } else {
    // SECTION_HEADER가 존재하지 않는 경우, 새롭게 추가
    if (content.includes(INSERT_MARKER)) {
      // INSERT_MARKER(---)가 있는 경우, 그 앞에 섹션 추가
      const replacement = `${SECTION_HEADER}\n${newPosts}\n${INSERT_MARKER}`;
      content = content.replace(INSERT_MARKER, replacement);

      console.log('✅ 새로운 Blog Posts 섹션을 추가합니다.');
    } else {
      // INSERT_MARKER도 없는 경우, 파일 끝에 추가
      content += `\n${SECTION_HEADER}\n${newPosts}\n${INSERT_MARKER}`;

      console.log('✅ 파일 끝에 Blog Posts 섹션과 구분선을 추가합니다.');
    }
  }

  // 파일 저장
  try {
    writeFileSync(filePath, content, 'utf8');
    console.log('✅ README.md 업데이트 완료');
  } catch (error) {
    console.error('❌ README.md 파일을 저장하는 중 오류 발생:', error);
  }
}

// 실행 함수
(async function main() {
  const recentPosts = await fetchRecentPosts(RSS_FEED_URL);
  updateReadme(README_PATH, recentPosts);
})();

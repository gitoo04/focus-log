# 집중기록 PWA

아이폰 Safari와 일반 브라우저에서 사용하는 개인용 집중력 기록 웹앱입니다.

## 들어 있는 기능

- 집중 시작, 집중 깨짐, 종료
- 실행 중인 타이머와 메모 자동 저장
- 날짜별 총 시간, 평균, 최장 기록, 집중 깨짐 횟수
- 세션별 시작·종료 시각, 지속시간, 메모
- 브라우저를 닫은 뒤에도 유지되는 `localStorage` 기록
- 홈 화면 설치, 전체화면 실행, 오프라인 실행을 위한 PWA 구성

## 파일 구성

```text
index.html
styles.css
app.js
manifest.webmanifest
sw.js
icons/
  apple-touch-icon.png
  icon-192.png
  icon-512.png
  icon-maskable-512.png
```

## 꼭 알아둘 점

기록은 서버가 아니라 현재 브라우저의 `localStorage`에 저장됩니다. Safari의 웹사이트 데이터를 지우거나 앱을 삭제하면 기록도 사라질 수 있습니다. 같은 GitHub Pages 주소라도 다른 기기나 다른 브라우저와 기록이 자동 동기화되지는 않습니다.

자세한 GitHub Pages 배포 및 아이폰 설치 방법은 함께 제공된 `설치방법.md`를 확인하세요.

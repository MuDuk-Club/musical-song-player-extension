// 백그라운드 서비스 워커
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("받은 메시지:", message);

  if (message.action === "playVideo") {
    if (!message.videoId) {
      console.error("videoId가 전달되지 않았습니다!");
      sendResponse({ status: "error", message: "videoId가 없습니다." });
      return;
    }

    // YouTube URL로 새 탭 열기 (embed 대신 일반 URL 사용)
    let url = `https://www.youtube.com/watch?v=${message.videoId}`;
    
    chrome.tabs.create({ url: url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("탭 생성 오류:", chrome.runtime.lastError);
        sendResponse({ status: "error", message: "탭을 열 수 없습니다." });
      } else {
        console.log("새 탭이 열렸습니다:", tab.id);
        sendResponse({ status: "success", tabId: tab.id });
      }
    });
    
    return true; // 비동기 응답을 위해 true 반환
  } else if (message.action === "getFavorites") {
    // 즐겨찾기 목록 반환
    sendResponse({ favorites: JSON.parse(localStorage.getItem('favorites') || '[]') });
  } else if (message.action === "setFavorites") {
    // 즐겨찾기 목록 저장
    localStorage.setItem('favorites', JSON.stringify(message.favorites));
    sendResponse({ status: "saved" });
  }
});

// 확장 프로그램 설치 시 초기화
chrome.runtime.onInstalled.addListener(() => {
  console.log("뮤지컬 넘버 컬렉션 확장 프로그램이 설치되었습니다.");
});

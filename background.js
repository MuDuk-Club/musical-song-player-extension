// 백그라운드 서비스 워커
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("받은 메시지:", message);

  if (message.action === "playVideo") {
    if (!message.videoId) {
      console.error("videoId가 전달되지 않았습니다!");
      sendResponse({ status: "error", message: "videoId가 없습니다." });
      return;
    }

    // songTitle이 없으면 기본값 사용
    const songTitle = message.songTitle || `뮤지컬 넘버 (${message.videoId})`;
    console.log("재생할 노래:", { videoId: message.videoId, songTitle: songTitle });

    // YouTube embed URL로 직접 새 창 열기 (소리 활성화)
    let embedUrl = `https://www.youtube.com/embed/${message.videoId}?autoplay=1&controls=1&mute=0&showinfo=0&modestbranding=1&rel=0`;
    
    chrome.windows.create({
      url: embedUrl,
      type: 'popup',
      width: 480,
      height: 360,
      focused: true
    }, (window) => {
      if (chrome.runtime.lastError) {
        console.error("창 생성 오류:", chrome.runtime.lastError);
        sendResponse({ status: "error", message: "창을 열 수 없습니다." });
      } else {
        // 창이 열린 후 스크립트를 실행하여 제목 추가
        setTimeout(() => {
          try {
            chrome.scripting.executeScript({
              target: { tabId: window.tabs[0].id },
              func: (songTitle) => {
                // 기존 제목 요소가 있으면 제거
                const existingTitle = document.querySelector('.song-title');
                if (existingTitle) {
                  existingTitle.remove();
                }
                
                              // 노래 제목을 표시하는 div 추가
              const titleDiv = document.createElement('div');
              titleDiv.className = 'song-title';
              titleDiv.style.cssText = `
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 14px;
                color: #fff;
                z-index: 1000;
                text-align: center;
                font-family: Arial, sans-serif;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                background: rgba(0,0,0,0.7);
                padding: 8px 16px;
                border-radius: 4px;
                max-width: 90%;
                word-wrap: break-word;
              `;
              titleDiv.textContent = songTitle;
              
              document.body.appendChild(titleDiv);
              
              // 소리 활성화 안내 메시지 추가
              const soundHelpDiv = document.createElement('div');
              soundHelpDiv.className = 'sound-help';
              soundHelpDiv.style.cssText = `
                position: absolute;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 12px;
                color: #fff;
                z-index: 1000;
                text-align: center;
                font-family: Arial, sans-serif;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                background: rgba(0,0,0,0.8);
                padding: 6px 12px;
                border-radius: 4px;
                max-width: 90%;
                word-wrap: break-word;
              `;
              soundHelpDiv.textContent = '🔊 소리가 안 나오면 재생 버튼을 클릭하세요';
              
              document.body.appendChild(soundHelpDiv);
              
              // 5초 후 제목과 도움말 숨기기
              setTimeout(() => {
                titleDiv.style.opacity = '0';
                titleDiv.style.transition = 'opacity 1s';
                soundHelpDiv.style.opacity = '0';
                soundHelpDiv.style.transition = 'opacity 1s';
                setTimeout(() => {
                  titleDiv.remove();
                  soundHelpDiv.remove();
                }, 1000);
              }, 5000);
              },
              args: [songTitle]
            }, (result) => {
              if (chrome.runtime.lastError) {
                console.error("스크립트 실행 오류:", chrome.runtime.lastError);
              }
            });
          } catch (error) {
            console.error("스크립트 실행 중 오류:", error);
          }
        }, 1000);
        
        sendResponse({ status: "playing" });
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

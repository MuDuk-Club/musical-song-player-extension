// 전역 변수
let musicalSongs = [];
let currentFilter = 'all';
let searchQuery = '';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// DOM 요소들
const searchInput = document.getElementById('searchInput');
const filterContainer = document.getElementById('filterContainer');
const songList = document.getElementById('songList');

// 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM 로드 완료");
  
  // DOM 요소 확인
  if (!searchInput || !filterContainer || !songList) {
    console.error("필수 DOM 요소를 찾을 수 없습니다:", {
      searchInput: !!searchInput,
      filterContainer: !!filterContainer,
      songList: !!songList
    });
    return;
  }
  
  loadMusicalSongs();
  initializeEventListeners();
});

// 뮤지컬 노래 데이터 로드
async function loadMusicalSongs() {
  try {
    console.log("뮤지컬 노래 데이터 로드 시작");
    songList.innerHTML = '<div class="loading">데이터를 불러오는 중...</div>';
    
    const response = await fetch(chrome.runtime.getURL('musical-songs.json'));
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    musicalSongs = await response.json();
    console.log("로드된 노래 데이터:", musicalSongs);
    
    // 초기 렌더링 (제목 없이)
    renderSongList();
    
    // 각 노래의 제목을 YouTube API에서 가져오기
    await loadVideoTitles();
    
  } catch (error) {
    console.error('뮤지컬 노래 데이터 로드 실패:', error);
    songList.innerHTML = '<div class="loading">데이터를 불러오는 중 오류가 발생했습니다: ' + error.message + '</div>';
  }
}

// URL에서 videoId 추출하는 함수
function parseYouTubeUrl(url) {
  try {
    const urlObj = new URL(url);
    let videoId = '';

    // youtu.be 형식 처리
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.substring(1); // '/' 제거
    } 
    // youtube.com 형식 처리
    else if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v');
    }
    
    return { videoId };
  } catch (error) {
    console.error('URL 파싱 오류:', error);
    return { videoId: '' };
  }
}

// YouTube oEmbed API를 사용하여 제목 가져오기
async function loadVideoTitles() {
  console.log("YouTube 제목 로드 시작");
  
  for (let i = 0; i < musicalSongs.length; i++) {
    const song = musicalSongs[i];
    try {
      console.log(`처리 중: ${i + 1}/${musicalSongs.length} - ${song.url}`);
      
      // URL에서 videoId 추출
      const { videoId } = parseYouTubeUrl(song.url);
      song.videoId = videoId;
      
      if (!videoId) {
        console.error('videoId를 추출할 수 없습니다:', song.url);
        song.title = `잘못된 URL: ${song.url}`;
        continue;
      }
      
      // 썸네일 URL 생성
      song.thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      
      // YouTube oEmbed API로 제목 가져오기 (타임아웃 추가)
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      
      // 타임아웃이 있는 fetch 함수
      const fetchWithTimeout = async (url, timeout = 5000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };
      
      const response = await fetchWithTimeout(oembedUrl);
      
      if (response.ok) {
        const data = await response.json();
        song.title = data.title;
        console.log(`제목 로드 성공: ${song.title} (${videoId})`);
      } else {
        // API 실패 시 기본 제목 사용
        song.title = `뮤지컬 넘버 (${videoId})`;
        console.log(`제목 로드 실패 (${response.status}), 기본 제목 사용: ${videoId}`);
      }
    } catch (error) {
      console.error(`제목 로드 오류 (${song.url}):`, error);
      song.title = `뮤지컬 넘버 (${song.videoId || '알 수 없음'})`;
    }
    
    // 각 노래 처리 후 즉시 렌더링 업데이트
    renderSongList();
  }
  
  console.log("YouTube 제목 로드 완료");
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
  // 검색 기능
  searchInput.addEventListener('input', function(e) {
    searchQuery = e.target.value.toLowerCase();
    renderSongList();
  });

  // 필터 기능
  filterContainer.addEventListener('click', function(e) {
    if (e.target.classList.contains('filter-tag')) {
      // 활성 필터 변경
      document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.classList.remove('active');
      });
      e.target.classList.add('active');
      
      currentFilter = e.target.getAttribute('data-filter');
      renderSongList();
    }
  });


}

// 노래 목록 렌더링
function renderSongList() {
  const filteredSongs = getFilteredSongs();
  
  songList.innerHTML = '';
  
  if (filteredSongs.length === 0) {
    songList.innerHTML = '<div class="loading">검색 결과가 없습니다.</div>';
    return;
  }

  // 로딩이 완료된 노래만 필터링 (제목이 있고 기본 제목이 아닌 것)
  const loadedSongs = filteredSongs.filter(song => 
    song.title && 
    !song.title.includes('뮤지컬 넘버 (') && 
    !song.title.includes('잘못된 URL')
  );
  
  if (loadedSongs.length === 0) {
    songList.innerHTML = '<div class="loading">YouTube 제목을 불러오는 중...</div>';
    return;
  }

  loadedSongs.forEach(song => {
    const songElement = createSongElement(song);
    songList.appendChild(songElement);
  });
}

// 필터링된 노래 목록 가져오기
function getFilteredSongs() {
  let filtered = musicalSongs;

  // 검색 필터링
  if (searchQuery) {
    filtered = filtered.filter(song => 
      song.title.toLowerCase().includes(searchQuery) ||
      song.tag.toLowerCase().includes(searchQuery)
    );
  }

  // 태그 필터링
  if (currentFilter !== 'all') {
    if (currentFilter === 'favorite') {
      filtered = filtered.filter(song => favorites.includes(song.title));
    } else {
      filtered = filtered.filter(song => song.tag === currentFilter);
    }
  }

  return filtered;
}

// 노래 요소 생성
function createSongElement(song) {
  const li = document.createElement('li');
  li.className = 'song-item';
  
  const isFavorite = favorites.includes(song.title);
  
  li.innerHTML = `
    <img src="${song.thumbnail}" alt="${song.title}" class="song-thumbnail" onerror="this.style.display='none'">
    <div class="song-info">
      <div class="song-title">${song.title}</div>
      <div class="song-description">태그: ${song.tag}</div>
      <div class="song-hashtags">#${song.tag} #뮤지컬</div>
    </div>
    <div class="song-actions">
      <button class="play-btn" data-video-id="${song.videoId}" data-title="${song.title}" data-si="${song.si || ''}">▶</button>
      <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-song-title="${song.title}">${isFavorite ? '❤️' : '🤍'}</button>
    </div>
  `;

  // 재생 버튼 이벤트
  const playBtn = li.querySelector('.play-btn');
  playBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const videoId = this.getAttribute('data-video-id');
    const title = this.getAttribute('data-title');
    
    if (videoId) {
      openYouTubeInNewTab(videoId, title);
    } else {
      alert('비디오 ID를 찾을 수 없습니다.');
    }
  });

  // 즐겨찾기 버튼 이벤트
  const favoriteBtn = li.querySelector('.favorite-btn');
  favoriteBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const songTitle = this.getAttribute('data-song-title');
    toggleFavorite(songTitle, this);
  });

  return li;
}

// YouTube 새 탭에서 열기
function openYouTubeInNewTab(videoId, title) {
  console.log("YouTube 새 탭 열기 시도:", { videoId, title });
  
  chrome.runtime.sendMessage({ 
    action: "playVideo", 
    videoId: videoId,
    songTitle: title
  }, (response) => {
    console.log("Background 응답:", response);
    
    if (chrome.runtime.lastError) {
      console.error("Runtime 오류:", chrome.runtime.lastError);
      alert("영상을 열 수 없습니다: " + chrome.runtime.lastError.message);
      return;
    }
    
    if (response && response.status === "playing") {
      console.log("YouTube 영상이 새 창에서 열렸습니다.");
    } else {
      console.error("YouTube 영상 열기 실패:", response);
      alert("영상을 열 수 없습니다. 다시 시도해주세요.");
    }
  });
}

// 즐겨찾기 토글
function toggleFavorite(songTitle, buttonElement) {
  const index = favorites.indexOf(songTitle);
  
  if (index > -1) {
    // 즐겨찾기에서 제거
    favorites.splice(index, 1);
    buttonElement.textContent = '🤍';
    buttonElement.classList.remove('active');
  } else {
    // 즐겨찾기에 추가
    favorites.push(songTitle);
    buttonElement.textContent = '❤️';
    buttonElement.classList.add('active');
  }
  
  // 로컬 스토리지에 저장
  localStorage.setItem('favorites', JSON.stringify(favorites));
}
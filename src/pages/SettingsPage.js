import React, { useEffect, useMemo, useState } from 'react';
import { useAlert } from '../context/AlertContext';
import { useSensor } from '../context/SensorContext';
import { useWorker } from '../context/WorkerContext';
import './SettingsPage.css';

// 설정 카테고리 데이터입니다.
// UI는 이 배열을 기준으로 목록, 카운트, 상세 현황을 모두 렌더링합니다.
const settingsCategories = [
  {
    id: 'risk',
    title: '위험도 설정',
    description: '프로젝트 핵심 기능',
    icon: 'LV',
    tone: 'red',
    groups: [
      {
        title: '위험도 기준',
        levels: [
          {
            title: 'LV.1 (안전)',
            items: [
              { label: '안전모·안전조끼·안전화 정상 착용', detailType: 'safeSuit' },
            ],
          },
          {
            title: 'LV.2 (경고)',
            items: [
              { label: '작업복 미착용', detailType: 'safeSuit' },
              { label: '안전모 미착용', detailType: 'helmet' },
              { label: '안전화 미착용', detailType: 'safeShoes' },
            ],
          },
          {
            title: 'LV.3 (위험)',
            items: [
              { label: 'SOS 버튼', detailType: 'sos' },
              { label: '드론 즉시 출동', detailType: 'drone' },
              { label: '관리자 확인 후 720p 영상', detailType: 'camera' },
            ],
          },
        ],
      },
      {
        title: '추가 옵션',
        items: [
          { label: '관리자 알림', detailType: 'alert' },
          { label: '드론 자동 출발', detailType: 'drone' },
          { label: '119 자동 신고', detailType: 'emergencyCall' },
        ],
        checked: true,
      },
    ],
  },
  {
    id: 'wearable',
    title: '웨어러블 설정',
    description: '기획서 내용 그대로',
    icon: 'WR',
    tone: 'blue',
    groups: [
      {
        title: '안전화',
        items: [{ label: '착용 여부 감지 ON', detailType: 'safeShoes' }],
      },
      {
        title: '안전조끼',
        items: [
          { label: 'GPS 사용', detailType: 'gps' },
          { label: 'SOS 버튼 활성화', detailType: 'sos' },
          { label: '근로시간 측정', detailType: 'workTime' },
        ],
      },
      {
        title: '안전모',
        items: [
          { label: '낙상 감지', detailType: 'fall' },
          { label: '착용 여부 감지', detailType: 'helmet' },
        ],
      },
    ],
  },
  {
    id: 'drone',
    title: '드론 설정',
    description: '드론 관련 기능만 모아놓기',
    icon: 'DR',
    tone: 'cyan',
    groups: [
      {
        items: [
          { label: '비행 속도', detailType: 'drone' },
          { label: '착륙 높이', detailType: 'drone' },
          { label: '응급키트 종류', detailType: 'kit' },
          { label: 'YOLO 탐지 활성화', detailType: 'ai' },
          { label: '라이다 사용 여부', detailType: 'lidar' },
          { label: '초음파 센서 사용 여부', detailType: 'ultrasonic' },
          { label: '장애물 회피 ON/OFF', detailType: 'drone' },
          { label: '자동 복귀', detailType: 'drone' },
        ],
      },
    ],
  },
  {
    id: 'notification',
    title: '알림 설정',
    icon: 'AL',
    tone: 'amber',
    groups: [
      {
        items: [
          { label: '관리자 알림', detailType: 'alert' },
          { label: 'SMS', detailType: 'alert' },
          { label: '웹 알림', detailType: 'alert' },
          { label: '앱 푸시', detailType: 'alert' },
          { label: '이메일', detailType: 'alert' },
          { label: '경고음', detailType: 'alert' },
          { label: '알림 반복 횟수', detailType: 'alert' },
        ],
      },
    ],
  },
  {
    id: 'sensor',
    title: '센서 설정',
    description: 'ESP32와 연결되는 부분',
    icon: 'SN',
    tone: 'green',
    groups: [
      {
        items: [
          { label: '심박수 센서', detailType: 'heartRate' },
          { label: 'GPS', detailType: 'gps' },
          { label: '자이로', detailType: 'gyro' },
          { label: '라이다', detailType: 'lidar' },
          { label: '초음파', detailType: 'ultrasonic' },
          { label: '카메라', detailType: 'camera' },
          { label: 'ESP32 연결상태', detailType: 'esp32' },
        ],
      },
    ],
  },
  {
    id: 'admin',
    title: '관리자 설정',
    icon: 'AD',
    tone: 'slate',
    groups: [
      {
        items: [
          { label: '관리자 이름', detailType: 'admin' },
          { label: '부서', detailType: 'admin' },
          { label: '연락처', detailType: 'admin' },
          { label: '비밀번호 변경', detailType: 'admin' },
          { label: '관리자 추가', detailType: 'admin' },
          { label: '권한 설정', detailType: 'admin' },
        ],
      },
    ],
  },
  {
    id: 'system',
    title: '시스템 설정',
    icon: 'SY',
    tone: 'violet',
    groups: [
      {
        items: [
          { label: 'TCP 서버 주소', detailType: 'system' },
          { label: 'API 주소', detailType: 'system' },
          { label: 'ESP32 IP', detailType: 'esp32' },
          { label: '포트번호', detailType: 'system' },
          { label: '데이터 송수신 주기', detailType: 'system' },
          { label: '자동 백업', detailType: 'system' },
        ],
      },
    ],
  },
  {
    id: 'emergency-kit',
    title: '응급 키트 설정',
    icon: 'KT',
    tone: 'red',
    groups: [
      {
        items: [
          { label: '응급키트 종류', detailType: 'kit' },
          { label: 'AED 포함 여부', detailType: 'kit' },
          { label: '구급약품 목록', detailType: 'kit' },
          { label: '교체 주기', detailType: 'kit' },
          { label: '드론 적재 여부', detailType: 'kit' },
        ],
      },
    ],
  },
  {
    id: 'log',
    title: '로그 관리',
    icon: 'LG',
    tone: 'slate',
    groups: [
      {
        items: [
          { label: '작업자 기록', detailType: 'log' },
          { label: '드론 출동 기록', detailType: 'log' },
          { label: '위험 발생 기록', detailType: 'log' },
          { label: '낙상 기록', detailType: 'log' },
          { label: 'SOS 기록', detailType: 'log' },
          { label: '다운로드(CSV)', detailType: 'log' },
        ],
      },
    ],
  },
  {
    id: 'ai-yolo',
    title: 'AI 설정 (YOLO)',
    icon: 'AI',
    tone: 'blue',
    groups: [
      {
        items: [
          { label: '작업복 탐지', detailType: 'safeSuit' },
          { label: '안전모 탐지', detailType: 'helmet' },
          { label: '안전화 탐지', detailType: 'safeShoes' },
          { label: '신뢰도(Confidence)', detailType: 'ai' },
          { label: '탐지 주기(FPS)', detailType: 'ai' },
          { label: '모델 버전', detailType: 'ai' },
        ],
      },
    ],
  },
];

const equipmentKeyMap = {
  helmet: 'helmet',
  safeSuit: 'safeSuit',
  safeShoes: 'safeShoes',
};

const statusLabelMap = {
  normal: '정상',
  warning: '경고',
  danger: '위험',
  'off-duty': '퇴근',
};

// 카테고리에 직접 속한 항목과 하위 섹션 항목을 하나의 선택 목록으로 펼칩니다.
const flattenCategoryItems = (category) =>
  category.groups.flatMap((group) => {
    const levelItems = group.levels
      ? group.levels.flatMap((level) =>
          level.items.map((item) => ({
            ...item,
            groupTitle: level.title,
            checked: false,
          }))
        )
      : [];
    const regularItems = group.items
      ? group.items.map((item) => ({
          ...item,
          groupTitle: group.title,
          checked: group.checked,
        }))
      : [];

    return [...levelItems, ...regularItems];
  });

// 설정 화면 최초 진입 시 선택할 기본 카테고리/항목을 계산합니다.
const getDefaultSelection = () => ({
  categoryId: settingsCategories[0].id,
  itemLabel: flattenCategoryItems(settingsCategories[0])[0].label,
});

// 설정 상세 패널의 최근 변경/동기화 시간을 표시할 때 사용합니다.
const formatTime = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date));
};

// 선택한 설정 항목이 현재 앱 데이터 기준으로 정상/주의/위험 중 어디에 가까운지 계산합니다.
const getItemStatus = ({ item, workers, alerts, sensorData, isConnected, tick }) => {
  const totalWorkers = workers.length;
  const equipmentKey = equipmentKeyMap[item.detailType];

  // 안전장비 항목은 작업자 Context에 동기화된 센서 착용 여부를 기준으로 계산합니다.
  if (equipmentKey) {
    const equippedWorkers = workers.filter(
      (worker) => worker.sensorData?.equipmentStatus?.[equipmentKey]
    );
    const issueWorkers = workers.filter(
      (worker) => !worker.sensorData?.equipmentStatus?.[equipmentKey]
    );
    const rate = totalWorkers ? Math.round((equippedWorkers.length / totalWorkers) * 100) : 0;

    return {
      state: issueWorkers.length > 0 ? 'warning' : 'normal',
      summary: `${equippedWorkers.length}/${totalWorkers}명 정상`,
      metrics: [
        { label: '정상', value: `${equippedWorkers.length}명` },
        { label: '미착용', value: `${issueWorkers.length}명` },
        { label: '착용률', value: `${rate}%` },
      ],
      relatedWorkers: issueWorkers,
      progress: rate,
      lastUpdated: workers[0]?.lastUpdate,
    };
  }

  if (item.detailType === 'heartRate') {
    const riskyWorkers = workers.filter((worker) => {
      const heartRate = worker.sensorData?.heartRate;
      return heartRate < 60 || heartRate > 100;
    });
    const average = totalWorkers
      ? Math.round(
          workers.reduce((sum, worker) => sum + (worker.sensorData?.heartRate || 0), 0) /
            totalWorkers
        )
      : 0;

    return {
      state: riskyWorkers.length > 0 ? 'danger' : 'normal',
      summary: `평균 ${average} BPM`,
      metrics: [
        { label: '평균 심박수', value: `${average} BPM` },
        { label: '임계치 초과', value: `${riskyWorkers.length}명` },
        { label: '측정 대상', value: `${totalWorkers}명` },
      ],
      relatedWorkers: riskyWorkers,
      progress: Math.min(100, Math.max(0, average)),
      lastUpdated: workers[0]?.lastUpdate,
    };
  }

  if (item.detailType === 'alert') {
    const unreadCount = alerts.filter((alert) => !alert.read).length;
    return {
      state: alerts.length > 0 ? 'warning' : 'normal',
      summary: `미확인 ${unreadCount}건`,
      metrics: [
        { label: '전체 알림', value: `${alerts.length}건` },
        { label: '미확인', value: `${unreadCount}건` },
        { label: '긴급', value: `${alerts.filter((alert) => alert.severity === 'emergency').length}건` },
      ],
      relatedWorkers: workers.filter((worker) => worker.status === 'warning' || worker.status === 'danger'),
      progress: alerts.length > 0 ? 65 : 100,
      lastUpdated: alerts[0]?.timestamp,
    };
  }

  if (item.detailType === 'log') {
    const dangerCount = workers.filter((worker) => worker.status === 'danger').length;
    return {
      state: dangerCount > 0 ? 'warning' : 'normal',
      summary: `오늘 기록 ${totalWorkers + alerts.length + dangerCount}건`,
      metrics: [
        { label: '작업자 기록', value: `${totalWorkers}건` },
        { label: '위험 기록', value: `${dangerCount}건` },
        { label: '알림 기록', value: `${alerts.length}건` },
      ],
      relatedWorkers: workers.filter((worker) => worker.status !== 'normal'),
      progress: 78,
      lastUpdated: new Date(),
    };
  }

  if (item.detailType === 'esp32') {
    return {
      state: isConnected ? 'normal' : 'warning',
      summary: isConnected ? 'ESP32 연결됨' : 'ESP32 대기 중',
      metrics: [
        { label: '연결 상태', value: isConnected ? '연결' : '대기' },
        { label: '센서 채널', value: `${Object.keys(sensorData).length}개` },
        { label: '송수신 주기', value: '1초' },
      ],
      relatedWorkers: workers.slice(0, 3),
      progress: isConnected ? 100 : 45,
      lastUpdated: new Date(),
    };
  }

  // 실제 API가 없는 항목은 tick 값으로 움직이는 운영 지표를 표시합니다.
  const simulatedProgress = 72 + (tick % 18);
  const typeLabel = {
    drone: '드론 대기',
    gps: 'GPS 수신',
    sos: 'SOS 대기',
    fall: '낙상 감시',
    emergencyCall: '자동 신고 대기',
    workTime: '근로시간 집계',
    gyro: '자이로 측정',
    lidar: '라이다 측정',
    ultrasonic: '초음파 측정',
    camera: '카메라 대기',
    kit: '응급키트 준비',
    ai: 'YOLO 탐지',
    admin: '관리자 정보',
    system: '시스템 동기화',
  }[item.detailType] || '상태 확인';

  return {
    state: 'normal',
    summary: typeLabel,
    metrics: [
      { label: '동작 상태', value: '정상' },
      { label: '실시간 지표', value: `${simulatedProgress}%` },
      { label: '점검 대상', value: `${totalWorkers || 0}명` },
    ],
    relatedWorkers: workers.filter((worker) => worker.status !== 'normal').slice(0, 4),
    progress: simulatedProgress,
    lastUpdated: new Date(),
  };
};

const getCategoryItemCount = (category) => flattenCategoryItems(category).length;

/**
 * SettingStatusDetail 컴포넌트
 * 선택된 설정 항목의 현재 상태, 관련 지표, 권장 조치, 운영 메타데이터를 표시합니다.
 */
const SettingStatusDetail = ({ category, item, workers, alerts, sensorData, isConnected, tick }) => {
  const status = getItemStatus({ item, workers, alerts, sensorData, isConnected, tick });

  return (
    <aside className={`settings-detail settings-detail--${status.state}`} aria-live="polite">
      <div className="settings-detail__chrome">
        <span />
        <span />
        <span />
      </div>

      <div className="settings-detail__header">
        <div>
          <span className="settings-detail__eyebrow">{category.title}</span>
          <h3>{item.label}</h3>
          <p>{status.summary}</p>
        </div>
        <span className={`settings-state settings-state--${status.state}`}>
          {status.state === 'normal' ? '정상' : status.state === 'warning' ? '확인 필요' : '위험'}
        </span>
      </div>

      <div className="settings-health-row">
        <div
          className="settings-health-ring"
          style={{ '--progress': `${status.progress}%` }}
          aria-label={`${item.label} 상태 지표`}
        >
          <strong>{status.progress}</strong>
          <span>%</span>
        </div>
        <div className="settings-health-copy">
          <span>Realtime Signal</span>
          <strong>{status.summary}</strong>
          <p>항목 선택 시 현황, 관련 작업자, 지표가 즉시 갱신됩니다.</p>
        </div>
      </div>

      <div className="settings-metric-grid">
        {status.metrics.map((metric) => (
          <div key={metric.label} className="settings-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      <div className="settings-live-section">
        <div className="settings-live-section__heading">
          <h4>관련 작업자 현황</h4>
          <span>최근 갱신 {formatTime(status.lastUpdated)}</span>
        </div>

        {status.relatedWorkers.length > 0 ? (
          <div className="settings-worker-list">
            {status.relatedWorkers.map((worker) => (
              <div key={worker.id} className="settings-worker-row">
                <div>
                  <strong>{worker.name}</strong>
                  <span>{worker.workerId}</span>
                </div>
                <span className={`settings-worker-status settings-worker-status--${worker.status}`}>
                  {statusLabelMap[worker.status] || worker.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="settings-empty">현재 확인이 필요한 작업자가 없습니다.</div>
        )}
      </div>
    </aside>
  );
};

/**
 * SettingsPage 컴포넌트
 * 시스템, IoT, 관제, 알림 등 운영 설정을 카테고리별로 탐색하고 상태를 확인합니다.
 */
const SettingsPage = () => {
  const { workers, fetchWorkers } = useWorker();
  const { alerts } = useAlert();
  const { sensorData, isConnected } = useSensor();
  const [selection, setSelection] = useState(getDefaultSelection);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  // 상세 패널의 실시간 지표를 1초마다 갱신합니다.
  useEffect(() => {
    const timerId = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const selectedCategory = useMemo(
    () =>
      settingsCategories.find((category) => category.id === selection.categoryId) ||
      settingsCategories[0],
    [selection.categoryId]
  );

  // 현재 선택된 카테고리의 항목만 중앙 패널에 렌더링해 긴 전체 목록 스크롤을 없앱니다.
  const selectedCategoryItems = useMemo(
    () => flattenCategoryItems(selectedCategory),
    [selectedCategory]
  );

  const selectedItem = useMemo(() => {
    return selectedCategoryItems.find((item) => item.label === selection.itemLabel) ||
      selectedCategoryItems[0];
  }, [selectedCategoryItems, selection.itemLabel]);

  // 카테고리 아이콘 클릭 시 해당 카테고리의 첫 번째 항목까지 함께 선택해 상세 패널을 즉시 갱신합니다.
  const handleCategorySelect = (category) => {
    const firstItem = flattenCategoryItems(category)[0];

    setSelection({
      categoryId: category.id,
      itemLabel: firstItem?.label || '',
    });
  };

  // 세부 항목 클릭 시 카테고리는 유지하고 우측 상세 패널만 빠르게 교체합니다.
  const handleItemSelect = (item) => {
    setSelection({
      categoryId: selectedCategory.id,
      itemLabel: item.label,
    });
  };

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div>
          <span className="settings-hero__kicker">WORKSAFE+ Control Preset</span>
          <h1>설정</h1>
          <p>항목별 실시간 상태를 확인하고 안전 관제 기능을 조정합니다.</p>
        </div>
        <div className="settings-hero__stats">
          <div>
            <span>카테고리</span>
            <strong>{settingsCategories.length}</strong>
          </div>
          <div>
            <span>설정 항목</span>
            <strong>
              {settingsCategories.reduce((sum, category) => sum + getCategoryItemCount(category), 0)}
            </strong>
          </div>
          <div>
            <span>실시간</span>
            <strong>ON</strong>
          </div>
        </div>
      </section>

      <div className="settings-workspace">
        {/* 카테고리 아이콘 패널입니다. 사용자는 긴 설정 목록을 스크롤하지 않고 아이콘 클릭으로 영역을 전환합니다. */}
        <nav className="settings-category-dock" aria-label="설정 카테고리 선택">
          <div className="settings-category-dock__header">
            <span>Category</span>
            <strong>{selectedCategory.title}</strong>
          </div>

          <div className="settings-category-icon-grid">
            {settingsCategories.map((category) => (
              <button
                key={category.id}
                className={
                  selection.categoryId === category.id
                    ? `settings-category-icon settings-category-icon--${category.tone} is-active`
                    : `settings-category-icon settings-category-icon--${category.tone}`
                }
                type="button"
                aria-pressed={selection.categoryId === category.id}
                onClick={() => handleCategorySelect(category)}
              >
                <span className="settings-category-icon__mark">{category.icon}</span>
                <span className="settings-category-icon__label">{category.title}</span>
                <em>{getCategoryItemCount(category)}</em>
              </button>
            ))}
          </div>
        </nav>

        {/* 선택된 카테고리의 세부 설정만 표시하는 중앙 패널입니다. */}
        <section className={`settings-active-category settings-category--${selectedCategory.tone}`}>
          <div className="settings-category__heading settings-active-category__heading">
            <div className="settings-category__icon">{selectedCategory.icon}</div>
            <div>
              <span>Selected Preset</span>
              <h2>{selectedCategory.title}</h2>
              {selectedCategory.description && <p>{selectedCategory.description}</p>}
            </div>
            <strong>{getCategoryItemCount(selectedCategory)}개</strong>
          </div>

          {/* 그룹/레벨 구조는 기존 데이터 형태를 그대로 사용해 기능 명세와 화면 표현의 연결을 유지합니다. */}
          {selectedCategory.groups.map((group, groupIndex) => (
            <div key={`${selectedCategory.id}-${groupIndex}`} className="settings-panel">
              {group.title && <h3>{group.title}</h3>}

              {group.levels && (
                <div className="settings-level-list">
                  {group.levels.map((level) => (
                    <div key={level.title} className="settings-level">
                      <h4>{level.title}</h4>
                      <ul>
                        {level.items.map((item) => (
                          <li key={item.label}>
                            <button
                              className={
                                selection.itemLabel === item.label
                                  ? 'settings-item-button is-active'
                                  : 'settings-item-button'
                              }
                              type="button"
                              onClick={() => handleItemSelect(item)}
                            >
                              <span>{item.label}</span>
                              <em>{item.detailType}</em>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {group.items && (
                <ul className={group.checked ? 'settings-check-list' : 'settings-item-list'}>
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <button
                        className={
                          selection.itemLabel === item.label
                            ? 'settings-item-button is-active'
                            : 'settings-item-button'
                        }
                        type="button"
                        onClick={() => handleItemSelect(item)}
                      >
                        <span>{item.label}</span>
                        <em>{item.detailType}</em>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        <SettingStatusDetail
          category={selectedCategory}
          item={selectedItem}
          workers={workers}
          alerts={alerts}
          sensorData={sensorData}
          isConnected={isConnected}
          tick={tick}
        />
      </div>
    </div>
  );
};

export default SettingsPage;

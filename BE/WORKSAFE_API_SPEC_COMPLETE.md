# WORKSAFE+ API 명세서

기준일: 2026-07-21  
기준 소스: `src/main/java/com/worksafe/backend/domain/**`

이 문서는 현재 구현된 백엔드 코드를 기준으로 정리한 API 완성본이다.  
응답은 기본적으로 `ApiResponse<T>`를 사용하며, 일부 SSE 응답은 예외다.

## 1. 공통 규격

### 1.1 공통 응답 포맷

모든 일반 REST API 응답은 다음 형태를 따른다.

| 필드 | 타입 | 설명 |
|---|---|---|
| code | String | 응답 코드. 성공 시 `200`, 생성 성공 시 `201` |
| message | String | 응답 메시지 |
| data | T | 실제 응답 본문. 없으면 `null` |

### 1.2 공통 엔티티 필드

`BaseEntity`를 상속하는 엔티티는 공통으로 아래 필드를 가진다.

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | PK |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

---

## 2. 인증 API

Base Path: `/api/auth`

### 2.1 회원가입

- `POST /signup`

요청: `SignupRequest`  
응답: `ResponseEntity<ApiResponse<AuthUserResponse>>`

#### SignupRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| loginId | String | Y | 로그인 ID, 4~100자 |
| password | String | Y | 비밀번호, 8~100자 |
| name | String | Y | 이름, 1~100자 |
| role | UserRole | Y | 사용자 역할 |

#### AuthUserResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 사용자 ID |
| loginId | String | 로그인 ID |
| name | String | 이름 |
| role | UserRole | 역할 |

### 2.2 로그인

- `POST /login`

요청: `LoginRequest`  
응답: `ApiResponse<AuthTokenResponse>`

#### LoginRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| loginId | String | Y | 로그인 ID |
| password | String | Y | 비밀번호 |

#### AuthTokenResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| accessToken | String | 액세스 토큰 |
| refreshToken | String | 리프레시 토큰 |
| user | AuthUserResponse | 로그인한 사용자 정보 |

### 2.3 토큰 재발급

- `POST /refresh`

요청: `RefreshTokenRequest`  
응답: `ApiResponse<AuthTokenResponse>`

#### RefreshTokenRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| refreshToken | String | Y | 리프레시 토큰 |

### 2.4 내 정보 조회

- `GET /me`

요청: 없음  
응답: `ApiResponse<AuthUserResponse>`

### 2.5 비밀번호 변경

- `PATCH /password`

요청: `ChangePasswordRequest`  
응답: `ApiResponse<Void>`

#### ChangePasswordRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| currentPassword | String | Y | 현재 비밀번호 |
| newPassword | String | Y | 새 비밀번호, 8~100자 |

---

## 3. 작업자 API

Base Path: `/api/workers`

### 3.1 작업자 등록

- `POST /`

요청: `WorkerCreateRequest`  
응답: `ApiResponse<WorkerResponse>`

#### WorkerCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| name | String | Y | 작업자 이름, 100자 이하 |
| department | String | Y | 부서, 100자 이하 |
| phoneNumber | String | Y | 전화번호, 50자 이하 |
| rfidTag | String | Y | RFID 태그, 100자 이하 |
| status | WorkerStatus | Y | 작업자 상태 |
| currentLatitude | Double | N | 현재 위도 |
| currentLongitude | Double | N | 현재 경도 |

#### WorkerResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 작업자 ID |
| name | String | 이름 |
| department | String | 부서 |
| phoneNumber | String | 전화번호 |
| rfidTag | String | RFID 태그 |
| status | WorkerStatus | 상태 |
| currentLatitude | Double | 현재 위도 |
| currentLongitude | Double | 현재 경도 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

### 3.2 작업자 목록 조회

- `GET /`

응답: `ApiResponse<List<WorkerResponse>>`

### 3.3 작업자 상세 조회

- `GET /{workerId}`

경로 변수:

| 필드 | 타입 | 설명 |
|---|---|---|
| workerId | Long | 작업자 ID |

응답: `ApiResponse<WorkerResponse>`

### 3.4 작업자 수정

- `PATCH /{workerId}`

요청: `WorkerUpdateRequest`  
응답: `ApiResponse<WorkerResponse>`

#### WorkerUpdateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| name | String | N | 이름, 100자 이하 |
| department | String | N | 부서, 100자 이하 |
| phoneNumber | String | N | 전화번호, 50자 이하 |
| rfidTag | String | N | RFID 태그, 100자 이하 |
| status | WorkerStatus | N | 작업자 상태 |
| currentLatitude | Double | N | 현재 위도 |
| currentLongitude | Double | N | 현재 경도 |

### 3.5 작업자 위치 갱신

- `PATCH /{workerId}/location`

쿼리 파라미터:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| latitude | Double | Y | 위도 |
| longitude | Double | Y | 경도 |

응답: `ApiResponse<WorkerResponse>`

### 3.6 작업자 삭제

- `DELETE /{workerId}`

응답: `ApiResponse<Void>`

---

## 4. 센서 로그 API

Base Path: `/api/sensor-logs`

### 4.1 센서 로그 생성

- `POST /`

요청: `SensorLogCreateRequest`  
응답: `ApiResponse<SensorLogResponse>`

#### SensorLogCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | N | 작업자 ID |
| equipmentId | Long | N | 장비 ID |
| sensorType | SensorType | Y | 센서 유형 |
| bpm | Integer | N | 심박수 |
| spo2 | Double | N | 산소포화도 |
| bodyTemperature | Double | N | 체온 |
| accelerationX | Double | N | 가속도 X |
| accelerationY | Double | N | 가속도 Y |
| accelerationZ | Double | N | 가속도 Z |
| gyroX | Double | N | 자이로 X |
| gyroY | Double | N | 자이로 Y |
| gyroZ | Double | N | 자이로 Z |
| tiltX | Double | N | 기울기 X |
| tiltY | Double | N | 기울기 Y |
| tiltZ | Double | N | 기울기 Z |
| impactAmount | Double | N | 충격량 |
| latitude | Double | N | 위도 |
| longitude | Double | N | 경도 |
| speed | Double | N | 속도 |
| pressureValue | Double | N | 압력 값 |
| lidarFrontLeft | Double | N | 라이다 전방 좌측 |
| lidarFrontRight | Double | N | 라이다 전방 우측 |
| lidarBackLeft | Double | N | 라이다 후방 좌측 |
| lidarBackRight | Double | N | 라이다 후방 우측 |
| lidarSideLeft | Double | N | 라이다 좌측 |
| lidarSideRight | Double | N | 라이다 우측 |
| ultrasonicDistance | Double | N | 초음파 거리 |
| rawPayload | String | N | 원본 페이로드 |
| wearStatus | WearStatus | N | 착용 상태 |
| sosPressed | Boolean | N | SOS 버튼 여부 |
| riskLevel | RiskLevel | N | 위험 레벨 |
| measuredAt | LocalDateTime | N | 측정 시각 |

#### SensorLogResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 센서 로그 ID |
| worker | WorkerResponse | 작업자 정보 |
| equipment | EquipmentResponse | 장비 정보 |
| sensorType | SensorType | 센서 유형 |
| bpm | Integer | 심박수 |
| spo2 | Double | 산소포화도 |
| bodyTemperature | Double | 체온 |
| accelerationX | Double | 가속도 X |
| accelerationY | Double | 가속도 Y |
| accelerationZ | Double | 가속도 Z |
| gyroX | Double | 자이로 X |
| gyroY | Double | 자이로 Y |
| gyroZ | Double | 자이로 Z |
| tiltX | Double | 기울기 X |
| tiltY | Double | 기울기 Y |
| tiltZ | Double | 기울기 Z |
| impactAmount | Double | 충격량 |
| latitude | Double | 위도 |
| longitude | Double | 경도 |
| speed | Double | 속도 |
| pressureValue | Double | 압력 값 |
| lidarFrontLeft | Double | 라이다 전방 좌측 |
| lidarFrontRight | Double | 라이다 전방 우측 |
| lidarBackLeft | Double | 라이다 후방 좌측 |
| lidarBackRight | Double | 라이다 후방 우측 |
| lidarSideLeft | Double | 라이다 좌측 |
| lidarSideRight | Double | 라이다 우측 |
| ultrasonicDistance | Double | 초음파 거리 |
| rawPayload | String | 원본 페이로드 |
| wearStatus | WearStatus | 착용 상태 |
| sosPressed | boolean | SOS 버튼 여부 |
| riskLevel | RiskLevel | 위험 레벨 |
| measuredAt | LocalDateTime | 측정 시각 |
| createdAt | LocalDateTime | 생성 시각 |

### 4.2 센서 로그 전체 조회

- `GET /`

응답: `ApiResponse<List<SensorLogResponse>>`

### 4.3 작업자별 센서 로그 조회

- `GET /workers/{workerId}`

응답: `ApiResponse<List<SensorLogResponse>>`

### 4.4 장비별 센서 로그 조회

- `GET /equipment/{equipmentId}`

응답: `ApiResponse<List<SensorLogResponse>>`

### 4.5 작업자 최신 센서 로그 조회

- `GET /latest/workers/{workerId}`

응답: `ApiResponse<SensorLogResponse>`

---

## 5. IoT 수집 API

Base Path: `/api/iot`

### 5.1 RFID 출입 인증

- `POST /attendance`

요청: `AttendanceRequest`  
응답: `ApiResponse<AttendanceResponse>`

#### AttendanceRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| rfidTag | String | Y | RFID 태그 |
| attendanceType | AttendanceType | Y | 출입 유형 |
| measuredAt | LocalDateTime | N | 측정 시각 |

#### AttendanceResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| workerId | Long | 작업자 ID |
| name | String | 작업자 이름 |
| status | WorkerStatus | 작업자 상태 |

### 5.2 생체 데이터 수집

- `POST /biometrics`

요청: `BiometricRequest`  
응답: `ApiResponse<SensorLogResponse>`

#### BiometricRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | Y | 작업자 ID |
| equipmentId | Long | N | 장비 ID |
| bpm | Integer | N | 심박수 |
| spo2 | Double | N | 산소포화도 |
| bodyTemperature | Double | N | 체온 |
| measuredAt | LocalDateTime | N | 측정 시각 |

### 5.3 IMU 데이터 수집

- `POST /imu`

요청: `ImuRequest`  
응답: `ApiResponse<SensorLogResponse>`

#### ImuRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | Y | 작업자 ID |
| equipmentId | Long | N | 장비 ID |
| accelerationX | Double | N | 가속도 X |
| accelerationY | Double | N | 가속도 Y |
| accelerationZ | Double | N | 가속도 Z |
| gyroX | Double | N | 자이로 X |
| gyroY | Double | N | 자이로 Y |
| gyroZ | Double | N | 자이로 Z |
| tiltX | Double | N | 기울기 X |
| tiltY | Double | N | 기울기 Y |
| tiltZ | Double | N | 기울기 Z |
| impactAmount | Double | N | 충격량 |
| measuredAt | LocalDateTime | N | 측정 시각 |

### 5.4 GPS 위치 수집

- `POST /gps`

요청: `GpsRequest`  
응답: `ApiResponse<SensorLogResponse>`

#### GpsRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | Y | 작업자 ID |
| equipmentId | Long | N | 장비 ID |
| latitude | Double | Y | 위도 |
| longitude | Double | Y | 경도 |
| speed | Double | N | 이동 속도 |
| measuredAt | LocalDateTime | N | 측정 시각 |

### 5.5 안전장비 착용 상태 변경

- `POST /equipment-status`

요청: `EquipmentStatusRequest`  
응답: `ApiResponse<SensorLogResponse>`

#### EquipmentStatusRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | Y | 작업자 ID |
| equipmentId | Long | Y | 장비 ID |
| wearStatus | WearStatus | Y | 착용 상태 |
| pressureValue | Double | N | 압력 값 |
| measuredAt | LocalDateTime | N | 측정 시각 |

### 5.6 SOS 긴급 신고

- `POST /sos`

요청: `SosRequest`  
응답: `ApiResponse<RiskEventResponse>`

#### SosRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | Y | 작업자 ID |
| equipmentId | Long | N | 장비 ID |
| latitude | Double | N | 위도 |
| longitude | Double | N | 경도 |
| message | String | Y | 신고 메시지 |
| measuredAt | LocalDateTime | N | 측정 시각 |

### 5.7 드론 장애물 센서 수집

- `POST /drone-obstacle`

요청: `DroneObstacleRequest`  
응답: `ApiResponse<SensorLogResponse>`

#### DroneObstacleRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| droneId | Long | Y | 드론 ID |
| dispatchId | Long | N | 출동 ID |
| lidarFrontLeft | Double | N | 라이다 전방 좌측 |
| lidarFrontRight | Double | N | 라이다 전방 우측 |
| lidarBackLeft | Double | N | 라이다 후방 좌측 |
| lidarBackRight | Double | N | 라이다 후방 우측 |
| lidarSideLeft | Double | N | 라이다 좌측 |
| lidarSideRight | Double | N | 라이다 우측 |
| ultrasonicDistance | Double | N | 초음파 거리 |
| obstacleDetected | Boolean | N | 장애물 감지 여부 |
| measuredAt | LocalDateTime | N | 측정 시각 |

---

## 6. 알림 API

Base Path: `/api/alerts`

### 6.1 알림 목록 조회

- `GET /`

응답: `ApiResponse<List<AlertResponse>>`

### 6.2 읽지 않은 알림 목록 조회

- `GET /unread`

응답: `ApiResponse<List<AlertResponse>>`

### 6.3 알림 읽음 상태 변경

- `PATCH /{alertId}/read`

응답: `ApiResponse<AlertResponse>`

### 6.4 전체 알림 읽음 처리

- `PATCH /read-all`

응답: `ApiResponse<Void>`

### 6.5 실시간 알림 SSE 스트림 연결

- `GET /stream`

응답: `SseEmitter`

#### AlertResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 알림 ID |
| riskEvent | RiskEventResponse | 연관 위험 이벤트 |
| worker | WorkerResponse | 연관 작업자 |
| title | String | 알림 제목 |
| message | String | 알림 메시지 |
| severity | AlertSeverity | 심각도 |
| readStatus | AlertReadStatus | 읽음 상태 |
| createdAt | LocalDateTime | 생성 시각 |
| readAt | LocalDateTime | 읽음 시각 |

---

## 7. 위험 이벤트 API

### 7.1 위험 이벤트 관리 API

Base Path: `/api/risk-events`

#### 7.1.1 위험 이벤트 생성

- `POST /`

요청: `RiskEventCreateRequest`  
응답: `ApiResponse<RiskEventResponse>`

##### RiskEventCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | N | 작업자 ID |
| sourceType | RiskSourceType | Y | 발생 소스 |
| riskType | RiskType | Y | 위험 유형 |
| riskLevel | RiskLevel | Y | 위험 레벨 |
| description | String | Y | 설명 |
| latitude | Double | N | 위도 |
| longitude | Double | N | 경도 |
| occurredAt | LocalDateTime | N | 발생 시각 |
| status | RiskStatus | N | 상태 |

#### 7.1.2 위험 이벤트 목록 조회

- `GET /`

응답: `ApiResponse<List<RiskEventResponse>>`

#### 7.1.3 위험 이벤트 상세 조회

- `GET /{riskEventId}`

응답: `ApiResponse<RiskEventResponse>`

#### 7.1.4 위험 이벤트 상태 수정

- `PATCH /{riskEventId}/status`

요청: `RiskEventStatusUpdateRequest`  
응답: `ApiResponse<RiskEventResponse>`

##### RiskEventStatusUpdateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| status | RiskStatus | Y | 새 상태 |

#### 7.1.5 작업자별 위험 이벤트 목록 조회

- `GET /workers/{workerId}`

응답: `ApiResponse<List<RiskEventResponse>>`

### 7.2 위험 이벤트 리포트 API

Base Path: `/api/events/risk`

#### 7.2.1 위험 이벤트 생성

- `POST /`

요청: `RiskEventCreateRequest`  
응답: `ApiResponse<RiskEventResponse>`

#### 7.2.2 위험 이벤트 및 드론 영상 사고 리포트 조회

- `GET /`

쿼리 파라미터:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | N | 작업자 ID |
| riskLevel | RiskLevel | N | 위험 레벨 |
| status | RiskStatus | N | 위험 상태 |
| from | LocalDateTime | N | 시작 시각 |
| to | LocalDateTime | N | 종료 시각 |

응답: `ApiResponse<List<RiskEventReportResponse>>`

##### RiskEventReportResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| riskEvent | RiskEventResponse | 위험 이벤트 |
| droneDispatch | DroneDispatchResponse | 연관 드론 출동 정보 |
| droneVideo | DroneVideoResponse | 연관 드론 영상 정보 |

##### RiskEventResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 위험 이벤트 ID |
| worker | WorkerResponse | 작업자 |
| sourceType | RiskSourceType | 소스 유형 |
| riskType | RiskType | 위험 유형 |
| riskLevel | RiskLevel | 위험 레벨 |
| description | String | 설명 |
| latitude | Double | 위도 |
| longitude | Double | 경도 |
| status | RiskStatus | 상태 |
| occurredAt | LocalDateTime | 발생 시각 |
| resolvedAt | LocalDateTime | 해결 시각 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

---

## 8. 안전장비 API

Base Path: `/api/equipment`

### 8.1 안전장비 등록

- `POST /`

요청: `EquipmentCreateRequest`  
응답: `ApiResponse<EquipmentResponse>`

#### EquipmentCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | N | 배정 작업자 ID |
| serialNumber | String | Y | 시리얼 번호, 100자 이하 |
| name | String | Y | 장비명, 100자 이하 |
| type | EquipmentType | Y | 장비 종류 |
| status | EquipmentStatus | N | 장비 상태 |
| wearStatus | WearStatus | N | 착용 상태 |

### 8.2 안전장비 목록 조회

- `GET /`

응답: `ApiResponse<List<EquipmentResponse>>`

### 8.3 안전장비 착용 상태 및 불출/반납 조회

- `GET /status`

응답: `ApiResponse<List<EquipmentStatusResponse>>`

#### EquipmentStatusResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| equipment | EquipmentResponse | 장비 정보 |
| issuedAt | LocalDateTime | 불출 시각 |
| returnedAt | LocalDateTime | 반납 시각 |

### 8.4 안전장비 착용 이력 조회

- `GET /logs`

쿼리 파라미터:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | N | 작업자 ID |
| equipmentId | Long | N | 장비 ID |
| from | LocalDateTime | N | 시작 시각 |
| to | LocalDateTime | N | 종료 시각 |

응답: `ApiResponse<List<EquipmentLogResponse>>`

#### EquipmentLogResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 로그 ID |
| worker | WorkerResponse | 작업자 |
| equipment | EquipmentResponse | 장비 |
| wearStatus | WearStatus | 착용 상태 |
| issuedAt | LocalDateTime | 불출 시각 |
| returnedAt | LocalDateTime | 반납 시각 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

### 8.5 안전장비 상세 조회

- `GET /{equipmentId}`

응답: `ApiResponse<EquipmentResponse>`

### 8.6 안전장비 수정

- `PATCH /{equipmentId}`

요청: `EquipmentUpdateRequest`  
응답: `ApiResponse<EquipmentResponse>`

#### EquipmentUpdateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| serialNumber | String | N | 시리얼 번호 |
| name | String | N | 장비명 |
| type | EquipmentType | N | 장비 종류 |
| status | EquipmentStatus | N | 장비 상태 |
| wearStatus | WearStatus | N | 착용 상태 |

### 8.7 안전장비 배정

- `PATCH /{equipmentId}/assign/{workerId}`

응답: `ApiResponse<EquipmentResponse>`

### 8.8 안전장비 착용 상태 수정

- `PATCH /{equipmentId}/wear-status`

요청: `EquipmentWearStatusRequest`  
응답: `ApiResponse<EquipmentResponse>`

#### EquipmentWearStatusRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| wearStatus | WearStatus | Y | 착용 상태 |

### 8.9 안전장비 수동 착용 상태 설정

- `PATCH /{equipmentId}/manual-wear-status`

요청: `ManualWearStatusRequest`  
응답: `ApiResponse<EquipmentResponse>`

#### ManualWearStatusRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| wearStatus | WearStatus | Y | 수동 착용 상태 |
| reason | String | N | 사유, 500자 이하 |

### 8.10 부저 제어

- `PATCH /{equipmentId}/buzzer`

요청: `BuzzerControlRequest`  
응답: `ApiResponse<EquipmentResponse>`

#### BuzzerControlRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| enabled | Boolean | Y | 부저 on/off |
| reason | String | N | 사유, 500자 이하 |

### 8.11 작업 타이머 시작

- `PATCH /{equipmentId}/work-timer/start`

요청: `WorkTimerRequest`  
응답: `ApiResponse<EquipmentResponse>`

#### WorkTimerRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| reason | String | N | 사유, 500자 이하 |

### 8.12 작업 타이머 종료

- `PATCH /{equipmentId}/work-timer/stop`

요청: `WorkTimerRequest`  
응답: `ApiResponse<EquipmentResponse>`

### 8.13 안전장비 삭제

- `DELETE /{equipmentId}`

응답: `ApiResponse<Void>`

#### EquipmentResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 장비 ID |
| worker | WorkerResponse | 배정 작업자 |
| serialNumber | String | 시리얼 번호 |
| name | String | 장비명 |
| type | EquipmentType | 종류 |
| status | EquipmentStatus | 상태 |
| wearStatus | WearStatus | 착용 상태 |
| lastDetectedAt | LocalDateTime | 마지막 감지 시각 |
| buzzerEnabled | boolean | 부저 활성화 여부 |
| workTimerEnabled | boolean | 작업 타이머 활성화 여부 |
| workTimerStartedAt | LocalDateTime | 작업 타이머 시작 시각 |
| workTimerEndedAt | LocalDateTime | 작업 타이머 종료 시각 |
| manualWearOverride | boolean | 수동 착용 상태 오버라이드 여부 |
| manualWearStatus | WearStatus | 수동 착용 상태 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

---

## 9. 웨어러블 명령 API

Base Path: `/api/wearable-commands`

### 9.1 웨어러블 명령 등록

- `POST /`

요청: `WearableCommandCreateRequest`  
응답: `ApiResponse<WearableCommandResponse>`

#### WearableCommandCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| workerId | Long | Y | 작업자 ID |
| equipmentId | Long | Y | 장비 ID |
| commandType | WearableCommandType | Y | 명령 유형 |
| reason | String | N | 사유, 500자 이하 |

### 9.2 대기 중인 웨어러블 명령 조회

- `GET /pending`

응답: `ApiResponse<List<WearableCommandResponse>>`

### 9.3 웨어러블 명령 확인 처리

- `PATCH /{commandId}/ack`

응답: `ApiResponse<WearableCommandResponse>`

#### WearableCommandResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 명령 ID |
| worker | WorkerResponse | 작업자 |
| equipment | EquipmentResponse | 장비 |
| commandType | WearableCommandType | 명령 유형 |
| commandStatus | WearableCommandStatus | 명령 상태 |
| reason | String | 사유 |
| requestedAt | LocalDateTime | 요청 시각 |
| acknowledgedAt | LocalDateTime | 확인 시각 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

---

## 10. 드론 API

### 10.1 드론 관리 API

Base Path: `/api/drones`

#### 10.1.1 드론 등록

- `POST /`

요청: `DroneCreateRequest`  
응답: `ApiResponse<DroneResponse>`

##### DroneCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| name | String | Y | 드론명, 100자 이하 |
| serialNumber | String | Y | 시리얼 번호, 100자 이하 |
| modelName | String | Y | 모델명, 100자 이하 |
| status | DroneStatus | N | 상태 |
| batteryPercent | Integer | N | 배터리 잔량 |
| currentLatitude | Double | N | 현재 위도 |
| currentLongitude | Double | N | 현재 경도 |
| maxFlightMinutes | Integer | N | 최대 비행 시간 |
| payloadMounted | Boolean | Y | 응급키트 장착 여부 |

##### DroneResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 드론 ID |
| name | String | 드론명 |
| serialNumber | String | 시리얼 번호 |
| modelName | String | 모델명 |
| status | DroneStatus | 상태 |
| batteryPercent | Integer | 배터리 잔량 |
| currentLatitude | Double | 현재 위도 |
| currentLongitude | Double | 현재 경도 |
| maxFlightMinutes | Integer | 최대 비행 시간 |
| payloadMounted | boolean | 응급키트 장착 여부 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

#### 10.1.2 드론 목록 조회

- `GET /`

응답: `ApiResponse<List<DroneResponse>>`

#### 10.1.3 드론 상세 조회

- `GET /{droneId}`

응답: `ApiResponse<DroneResponse>`

#### 10.1.4 드론 정보 수정

- `PATCH /{droneId}`

요청: `DroneUpdateRequest`  
응답: `ApiResponse<DroneResponse>`

##### DroneUpdateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| name | String | N | 드론명 |
| serialNumber | String | N | 시리얼 번호 |
| modelName | String | N | 모델명 |
| status | DroneStatus | N | 상태 |
| batteryPercent | Integer | N | 배터리 잔량 |
| currentLatitude | Double | N | 현재 위도 |
| currentLongitude | Double | N | 현재 경도 |
| maxFlightMinutes | Integer | N | 최대 비행 시간 |
| payloadMounted | Boolean | N | 응급키트 장착 여부 |

#### 10.1.5 드론 삭제

- `DELETE /{droneId}`

응답: `ApiResponse<Void>`

#### 10.1.6 드론 출동 명령

- `POST /{droneId}/dispatch`

요청: `DroneDispatchCreateRequest`  
응답: `ApiResponse<DroneDispatchResponse>`

##### DroneDispatchCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| riskEventId | Long | Y | 연계 위험 이벤트 ID |
| targetLatitude | Double | N | 목표 위도 |
| targetLongitude | Double | N | 목표 경도 |
| commandMessage | String | N | 명령 메시지 |

##### DroneDispatchResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 출동 ID |
| drone | DroneResponse | 드론 |
| riskEvent | RiskEventResponse | 위험 이벤트 |
| targetLatitude | Double | 목표 위도 |
| targetLongitude | Double | 목표 경도 |
| dispatchReason | String | 출동 사유 |
| emergencyKitMounted | boolean | 응급키트 장착 여부 |
| emergencyKitDropped | boolean | 응급키트 투하 여부 |
| dropLatitude | Double | 실제 투하 위도 |
| dropLongitude | Double | 실제 투하 경도 |
| dropMethod | DropMethod | 투하 방식 |
| emergencyCallRequested | boolean | 119 신고 요청 여부 |
| emergencyCallStatus | EmergencyCallStatus | 119 신고 상태 |
| status | DroneDispatchStatus | 출동 상태 |
| commandMessage | String | 명령 메시지 |
| dispatchedAt | LocalDateTime | 출동 시각 |
| arrivedAt | LocalDateTime | 도착 시각 |
| completedAt | LocalDateTime | 완료 시각 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

#### 10.1.7 드론 출동 목록 조회

- `GET /dispatches`

응답: `ApiResponse<List<DroneDispatchResponse>>`

#### 10.1.8 드론 출동 상세 조회

- `GET /dispatches/{dispatchId}`

응답: `ApiResponse<DroneDispatchResponse>`

#### 10.1.9 드론 출동 상태 변경

- `PATCH /dispatches/{dispatchId}/status`

요청: `DroneDispatchStatusUpdateRequest`  
응답: `ApiResponse<DroneDispatchResponse>`

##### DroneDispatchStatusUpdateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| status | DroneDispatchStatus | Y | 새 출동 상태 |

#### 10.1.10 드론 영상 송출 생성

- `POST /{droneId}/videos`

요청: `DroneVideoCreateRequest`  
응답: `ApiResponse<DroneVideoResponse>`

##### DroneVideoCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| streamUrl | String | Y | 영상 스트림 URL, 500자 이하 |
| protocol | VideoProtocol | Y | 전송 프로토콜 |
| dispatchId | Long | N | 연관 출동 ID |
| title | String | N | 제목, 200자 이하 |
| description | String | N | 설명, 500자 이하 |

##### DroneVideoResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 영상 ID |
| drone | DroneResponse | 드론 |
| dispatchId | Long | 출동 ID |
| title | String | 제목 |
| description | String | 설명 |
| streamUrl | String | 스트림 URL |
| protocol | VideoProtocol | 프로토콜 |
| active | boolean | 활성 여부 |
| streamStatus | StreamStatus | 스트림 상태 |
| startedAt | LocalDateTime | 송출 시작 시각 |
| endedAt | LocalDateTime | 송출 종료 시각 |
| lastFrameAt | LocalDateTime | 마지막 프레임 수신 시각 |
| createdAt | LocalDateTime | 생성 시각 |

#### 10.1.11 활성 드론 영상 목록 조회

- `GET /{droneId}/videos/active`

응답: `ApiResponse<DroneVideoResponse>`

### 10.2 드론 영상 API

Base Path: `/api/drone-videos`

#### 10.2.1 드론 영상 송출 시작

- `PATCH /{videoId}/start`

응답: `ApiResponse<DroneVideoResponse>`

#### 10.2.2 드론 영상 송출 중지

- `PATCH /{videoId}/stop`

응답: `ApiResponse<DroneVideoResponse>`

### 10.3 드론 투하 로그 API

Base Path: `/api`

#### 10.3.1 응급키트 투하 로그 생성

- `POST /drone-dispatches/{dispatchId}/drop-logs`

요청: `DroneDropLogCreateRequest`  
응답: `ApiResponse<DroneDropLogResponse>`

##### DroneDropLogCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| dropMethod | DropMethod | Y | 투하 방식 |
| targetLatitude | Double | N | 목표 위도 |
| targetLongitude | Double | N | 목표 경도 |
| actualDropLatitude | Double | N | 실제 투하 위도 |
| actualDropLongitude | Double | N | 실제 투하 경도 |
| obstacleDetected | Boolean | N | 장애물 감지 여부 |
| lidarFrontLeft | Double | N | 라이다 전방 좌측 |
| lidarFrontRight | Double | N | 라이다 전방 우측 |
| lidarBackLeft | Double | N | 라이다 후방 좌측 |
| lidarBackRight | Double | N | 라이다 후방 우측 |
| lidarSideLeft | Double | N | 라이다 좌측 |
| lidarSideRight | Double | N | 라이다 우측 |
| dropStatus | DropStatus | N | 투하 상태 |

#### 10.3.2 응급키트 투하 로그 목록 조회

- `GET /drone-dispatches/{dispatchId}/drop-logs`

응답: `ApiResponse<List<DroneDropLogResponse>>`

#### 10.3.3 응급키트 투하 상태 변경

- `PATCH /drone-drop-logs/{dropLogId}/status`

요청: `DroneDropLogStatusUpdateRequest`  
응답: `ApiResponse<DroneDropLogResponse>`

##### DroneDropLogStatusUpdateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| dropStatus | DropStatus | Y | 투하 상태 |
| actualDropLatitude | Double | N | 실제 투하 위도 |
| actualDropLongitude | Double | N | 실제 투하 경도 |

##### DroneDropLogResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Long | 투하 로그 ID |
| droneDispatch | DroneDispatchResponse | 출동 정보 |
| drone | DroneResponse | 드론 |
| worker | WorkerResponse | 작업자 |
| riskEvent | RiskEventResponse | 위험 이벤트 |
| dropMethod | DropMethod | 투하 방식 |
| targetLatitude | Double | 목표 위도 |
| targetLongitude | Double | 목표 경도 |
| actualDropLatitude | Double | 실제 투하 위도 |
| actualDropLongitude | Double | 실제 투하 경도 |
| obstacleDetected | boolean | 장애물 감지 여부 |
| lidarFrontLeft | Double | 라이다 전방 좌측 |
| lidarFrontRight | Double | 라이다 전방 우측 |
| lidarBackLeft | Double | 라이다 후방 좌측 |
| lidarBackRight | Double | 라이다 후방 우측 |
| lidarSideLeft | Double | 라이다 좌측 |
| lidarSideRight | Double | 라이다 우측 |
| dropStatus | DropStatus | 투하 상태 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

---

## 11. 대시보드 API

Base Path: `/api/dashboard`

### 11.1 대시보드 요약 조회

- `GET /summary`

응답: `ApiResponse<DashboardSummaryResponse>`

#### DashboardSummaryResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| totalWorkers | long | 전체 작업자 수 |
| normalWorkers | long | 정상 작업자 수 |
| warningWorkers | long | 주의 작업자 수 |
| dangerWorkers | long | 위험 작업자 수 |
| lv1RiskEvents | long | LV1 위험 건수 |
| lv2RiskEvents | long | LV2 위험 건수 |
| lv3RiskEvents | long | LV3 위험 건수 |
| lv4RiskEvents | long | LV4 위험 건수 |
| totalEquipment | long | 전체 장비 수 |
| wornEquipment | long | 착용 장비 수 |
| notWornEquipment | long | 미착용 장비 수 |
| activeRiskEvents | long | 활성 위험 이벤트 수 |
| unreadAlerts | long | 읽지 않은 알림 수 |
| activeDroneDispatches | long | 활성 드론 출동 수 |
| emergencyKitDropped | long | 응급키트 투하 수 |
| activeBuzzerCommands | long | 활성 부저 명령 수 |
| readyDrones | long | 대기 중인 드론 수 |
| flyingDrones | long | 비행 중인 드론 수 |

### 11.2 작업자 상태 조회

- `GET /workers/status`

응답: `ApiResponse<DashboardWorkerStatusResponse>`

#### DashboardWorkerStatusResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| totalWorkers | long | 전체 작업자 수 |
| normalWorkers | long | 정상 작업자 수 |
| warningWorkers | long | 주의 작업자 수 |
| dangerWorkers | long | 위험 작업자 수 |
| inactiveWorkers | long | 비활성 작업자 수 |

### 11.3 장비 상태 조회

- `GET /equipment/status`

응답: `ApiResponse<DashboardEquipmentStatusResponse>`

#### DashboardEquipmentStatusResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| totalEquipment | long | 전체 장비 수 |
| wornEquipment | long | 착용 장비 수 |
| notWornEquipment | long | 미착용 장비 수 |
| unknownEquipment | long | 미확인 장비 수 |

### 11.4 최근 위험 이벤트 조회

- `GET /risk-events/recent`

응답: `ApiResponse<List<RiskEventResponse>>`

### 11.5 드론 상태 조회

- `GET /drones/status`

응답: `ApiResponse<DashboardDroneStatusResponse>`

#### DashboardDroneStatusResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| readyDrones | long | 대기 드론 수 |
| flyingDrones | long | 비행 드론 수 |
| returningDrones | long | 복귀 드론 수 |
| chargingDrones | long | 충전 드론 수 |
| maintenanceDrones | long | 점검 드론 수 |
| disabledDrones | long | 비활성 드론 수 |

---

## 12. Enum 부록

### 12.1 인증 / 작업자

#### UserRole

- `WORKER`
- `MANAGER`

#### WorkerStatus

- `NORMAL`
- `WARNING`
- `DANGER`
- `INACTIVE`

### 12.2 IoT / 센서 / 착용

#### SensorType

- `RFID`
- `BIOMETRIC`
- `MOTION`
- `GPS`
- `WEAR_STATUS`
- `SOS`
- `LIDAR`
- `ULTRASONIC`
- `DRONE_OBSTACLE`

#### AttendanceType

- `CHECK_IN`
- `CHECK_OUT`

#### WearStatus

- `WORN`
- `NOT_WORN`
- `UNKNOWN`

### 12.3 안전장비 / 웨어러블

#### EquipmentType

- `HELMET`
- `BELT`
- `SHOES`
- `SENSOR_DEVICE`
- `SOS_BUTTON`
- `GPS_MODULE`

#### EquipmentStatus

- `AVAILABLE`
- `ASSIGNED`
- `LOST`
- `BROKEN`
- `DISCARDED`

#### WearableCommandType

- `BUZZER_ON`
- `BUZZER_OFF`
- `TIMER_START`
- `TIMER_STOP`

#### WearableCommandStatus

- `REQUESTED`
- `SENT`
- `ACKNOWLEDGED`
- `FAILED`

### 12.4 위험 이벤트

#### RiskLevel

- `LV1`
- `LV2`
- `LV3`
- `LV4`

#### RiskSourceType

- `SENSOR`
- `SOS`
- `MANUAL`
- `DRONE`

#### RiskType

- `NO_EQUIPMENT`
- `FALL_DETECTED`
- `SOS_REQUEST`
- `BIOMETRIC_ABNORMAL`
- `LOCATION_ABNORMAL`
- `DRONE_DISPATCHED`

#### RiskStatus

- `OPEN`
- `PROCESSING`
- `RESOLVED`

### 12.5 알림

#### AlertSeverity

- `INFO`
- `WARNING`
- `DANGER`
- `EMERGENCY`

#### AlertReadStatus

- `UNREAD`
- `READ`

### 12.6 드론

#### DroneStatus

- `READY`
- `FLYING`
- `RETURNING`
- `CHARGING`
- `MAINTENANCE`
- `DISABLED`

#### DroneDispatchStatus

- `REQUESTED`
- `DISPATCHED`
- `ARRIVED`
- `KIT_DROPPING`
- `KIT_DROPPED`
- `RETURNED`
- `FAILED`
- `CANCELED`

#### DropMethod

- `MANUAL`
- `YOLO_TARGET`
- `LIDAR_SAFE_POINT`

#### DropStatus

- `READY`
- `DROPPING`
- `DROPPED`
- `FAILED`
- `CANCELED`

#### EmergencyCallStatus

- `NOT_REQUESTED`
- `REQUESTED`
- `COMPLETED`
- `FAILED`

#### StreamStatus

- `READY`
- `STREAMING`
- `STOPPED`
- `FAILED`

#### VideoProtocol

- `RTSP`
- `HLS`
- `WEBRTC`

---

## 13. 구현상 참고

- 현재 역할은 `ADMIN`이 아니라 `WORKER` / `MANAGER`다.
- 드론 모델명은 `modelName` 자유 입력이며 `MG-401-1` 고정값이 아니다.
- `119` 연동은 외부 호출이 아니라 상태 플래그 기록 방식이다.
- 알림 SSE는 `AlertResponse`를 그대로 이벤트 payload로 전송한다.
- 장비 불출/반납은 `EquipmentLog.issuedAt` / `EquipmentLog.returnedAt`으로 관리한다.


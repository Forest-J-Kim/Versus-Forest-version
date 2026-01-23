-- 1. 내 유저 ID 확인 (이미 찾으셨다면 생략 가능하지만 확인차 실행)
SELECT "id", "email" FROM "User"; -- 여기서 본인 ID 복사

-------------------------------------------------------
-- [중요] 아래 '내_진짜_아이디_....' 부분을 모두 본인의 실제 ID로 바꾸세요!
-------------------------------------------------------

-- 2. 내 프로필(강펀치) 정보 생성/업데이트
-- 참고: Auth에는 있어도 public.User 테이블에 없어서 'Me [- / -]'로 뜨는 것입니다.
INSERT INTO "User" ("id", "email", "name", "position", "weightClass", "tier")
VALUES 
('내_진짜_아이디_여기에_붙여넣기', 'my_email@example.com', '강펀치', '오소독스', '78kg', 'PRO')
ON CONFLICT ("id") DO UPDATE 
SET "name" = '강펀치',
    "position" = '오소독스',
    "weightClass" = '78kg';

-- 3. '리엔케이 복싱클럽' 팀 생성
INSERT INTO "Team" ("id", "name", "leaderId", "regions", "homeStadium", "mannerScore")
VALUES 
(uuid_generate_v4(), '리엔케이 복싱클럽', '내_진짜_아이디_여기에_붙여넣기', 'Seoul', true, 5.0)
ON CONFLICT DO NOTHING; -- 이미 있으면 패스

-- 4. 나를 팀 멤버(리더)로 연결
INSERT INTO "TeamMember" ("userId", "teamId", "role")
SELECT 
  '내_진짜_아이디_여기에_붙여넣기',
  id,
  'LEADER'
FROM "Team" WHERE "name" = '리엔케이 복싱클럽'
ON CONFLICT ("userId", "teamId") DO NOTHING;

-- 5. 추가 팀원(스파링 파트너) 생성 및 연결
-- 이 파트너가 보여야 드롭다운 테스트가 가능합니다.
WITH new_member AS (
  INSERT INTO "User" ("id", "email", "name", "position", "weightClass", "tier")
  VALUES 
  (uuid_generate_v4(), 'partner@versus.com', '김스파링', '사우스포', '72kg', 'AMATEUR')
  RETURNING id
)
INSERT INTO "TeamMember" ("userId", "teamId", "role")
SELECT 
  new_member.id,
  team.id,
  'MEMBER'
FROM new_member, "Team" team
WHERE team.name = '리엔케이 복싱클럽';

-- 확인용 조회
SELECT * FROM "User" WHERE "name" = '강펀치';
SELECT * FROM "Team" WHERE "name" = '리엔케이 복싱클럽';

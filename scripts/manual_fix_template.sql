-- 1단계: 내 유저 ID (UUID) 확인
-- 이 쿼리를 실행해서 본인의 email에 해당하는 id를 찾으세요.
SELECT "id", "email", "name" FROM "User";

-- 2단계: 팀 리더 권한 강제 위임
-- 아래 '내_진짜_아이디_....' 부분을 위에서 찾은 ID로 변경해서 실행하세요.
-- 예: '1234-5678-...'
UPDATE "Team" 
SET "leaderId" = '내_진짜_아이디_여기에_붙여넣기' 
WHERE "name" = 'Inter Miami CF'; -- 또는 원하는 다른 팀 이름

-- 3단계: 나를 팀 멤버로 등록 (필수)
-- 데이터를 조작하여 'TeamMember' 테이블에도 관계를 만들어줍니다.
INSERT INTO "TeamMember" ("userId", "teamId", "role")
SELECT 
  '내_진짜_아이디_여기에_붙여넣기', -- 위와 동일한 내 ID
  id, 
  'LEADER'
FROM "Team" 
WHERE "name" = 'Inter Miami CF' -- 위와 동일한 팀 이름
ON CONFLICT ("userId", "teamId") DO NOTHING;

-- 4단계: 결과 확인
SELECT * FROM "Team" WHERE "leaderId" = '내_진짜_아이디_여기에_붙여넣기';
SELECT * FROM "TeamMember" WHERE "userId" = '내_진짜_아이디_여기에_붙여넣기';

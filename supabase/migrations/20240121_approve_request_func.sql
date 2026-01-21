create or replace function approve_team_request(request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_team_id uuid;
  v_player_id uuid;
begin
  -- 1. Get request info and verify it exists and is pending
  select team_id, player_id into v_team_id, v_player_id
  from team_requests
  where id = request_id and status = 'pending';

  if v_team_id is null then
    raise exception 'Request not found or not pending';
  end if;

  -- 2. Update request status
  update team_requests
  set status = 'approved',
      updated_at = now()
  where id = request_id;

  -- 3. Update player's team_id
  update players
  set team_id = v_team_id
  where id = v_player_id;

end;
$$;

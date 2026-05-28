-- ZimLivestock Database Schema
-- Source of truth: regenerated from prod via `pg_dump --schema-only`
-- Regenerated: 2026-05-28
-- Project: hmeieslclzycyjjjflfh
--
-- To regenerate:
--   1. supabase db dump --schema public --dry-run | grep '^export PG' | sed 's/^/  /'
--   2. eval the export lines above (or supply password)
--   3. /opt/homebrew/opt/postgresql@17/bin/pg_dump --schema-only \
--        --quote-all-identifiers --role postgres --schema=public \
--      | sed (CLI pipeline — see `supabase db dump --dry-run`) \
--      | awk 'NR==1 || /^\\(un)?restrict/ {next} 1' \
--      | awk 'BEGIN{skip=1} /^CREATE SCHEMA/{skip=0} skip{next} 1' \
--      > supabase/schema.sql
--   4. Prepend this header back.
--
-- RLS policies are also dumped here (mirrors prod). `rls_policies.sql`
-- remains the hand-curated authoritative source for new policy work;
-- regenerate this file after applying new policies to keep in sync.

CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."agent_place_bid"("p_agent_id" "uuid", "p_goal_id" "uuid", "p_livestock_id" "uuid", "p_amount" numeric, "p_strategy" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare v_agent record; v_bid_id uuid; v_agent_bid_id uuid;
begin
  select * into v_agent from public.agents where id = p_agent_id and user_id = auth.uid();
  if not found then raise exception 'Agent not found or unauthorized'; end if;
  if v_agent.status != 'active' then raise exception 'Agent is not active'; end if;
  v_bid_id := public.place_bid(p_livestock_id, v_agent.user_id, p_amount);
  insert into public.agent_bids (agent_id, goal_id, livestock_id, bid_id, amount, strategy)
  values (p_agent_id, p_goal_id, p_livestock_id, v_bid_id, p_amount, p_strategy)
  returning id into v_agent_bid_id;
  insert into public.agent_activity_log (agent_id, event_type, message, metadata)
  values (p_agent_id, 'bid_placed', 'Placed ' || p_strategy || ' bid of US$' || p_amount,
    jsonb_build_object('livestock_id', p_livestock_id, 'bid_id', v_bid_id, 'amount', p_amount, 'strategy', p_strategy, 'goal_id', p_goal_id));
  update public.agents set stats = stats || jsonb_build_object('total_bids', (stats->>'total_bids')::int + 1, 'total_actions', (stats->>'total_actions')::int + 1)
  where id = p_agent_id;
  return v_agent_bid_id;
end;
$_$;


ALTER FUNCTION "public"."agent_place_bid"("p_agent_id" "uuid", "p_goal_id" "uuid", "p_livestock_id" "uuid", "p_amount" numeric, "p_strategy" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."default_user_tenant"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tenant_id from public.tenant_members
  where user_id = auth.uid()
  order by joined_at asc
  limit 1;
$$;


ALTER FUNCTION "public"."default_user_tenant"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."livestock_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "breed" "text" NOT NULL,
    "age" "text" NOT NULL,
    "weight" "text" NOT NULL,
    "description" "text" NOT NULL,
    "location" "text" NOT NULL,
    "health" "text" NOT NULL,
    "starting_price" numeric NOT NULL,
    "current_bid" numeric DEFAULT 0,
    "bid_count" integer DEFAULT 0,
    "view_count" integer DEFAULT 0,
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    "seller_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "duration_days" integer NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL,
    "is_demo" boolean DEFAULT false NOT NULL,
    "auction_format" "text" DEFAULT 'timed'::"text" NOT NULL,
    "verified_bidders_only" boolean DEFAULT false NOT NULL,
    "reference" "text",
    "transport_available" boolean DEFAULT false NOT NULL,
    "pickup_lat" numeric(9,6),
    "pickup_lng" numeric(9,6),
    CONSTRAINT "livestock_items_auction_format_check" CHECK (("auction_format" = ANY (ARRAY['live'::"text", 'timed'::"text"]))),
    CONSTRAINT "livestock_items_category_check" CHECK (("category" = ANY (ARRAY['Cattle'::"text", 'Goats'::"text", 'Sheep'::"text", 'Pigs'::"text", 'Chickens'::"text", 'Other'::"text"]))),
    CONSTRAINT "livestock_items_description_check" CHECK (("char_length"("description") <= 2000)),
    CONSTRAINT "livestock_items_duration_days_check" CHECK (("duration_days" = ANY (ARRAY[1, 3, 7, 14]))),
    CONSTRAINT "livestock_items_health_check" CHECK (("health" = ANY (ARRAY['Excellent'::"text", 'Good'::"text", 'Fair'::"text"]))),
    CONSTRAINT "livestock_items_starting_price_check" CHECK (("starting_price" > (0)::numeric)),
    CONSTRAINT "livestock_items_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'ended'::"text", 'sold'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "livestock_items_title_check" CHECK (("char_length"("title") <= 200))
);


ALTER TABLE "public"."livestock_items" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."agent_scan_listings"("p_agent_id" "uuid", "p_goal_id" "uuid") RETURNS SETOF "public"."livestock_items"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_goal record;
begin
  select * into v_goal from public.agent_goals where id = p_goal_id and agent_id = p_agent_id and status = 'active';
  if not found then raise exception 'Goal not found or inactive'; end if;
  return query
  select li.* from public.livestock_items li
  where li.status = 'active' and li.end_time > now() and li.category = v_goal.category
    and (v_goal.preferred_location is null or li.location = v_goal.preferred_location)
    and (v_goal.preferred_breed is null or li.breed ilike '%' || v_goal.preferred_breed || '%')
    and (v_goal.min_health = 'Fair' or (v_goal.min_health = 'Good' and li.health in ('Good', 'Excellent')) or (v_goal.min_health = 'Excellent' and li.health = 'Excellent'))
    and coalesce(li.current_bid, li.starting_price) <= v_goal.max_price
    and not exists (select 1 from public.agent_decisions ad where ad.livestock_id = li.id and ad.agent_id = p_agent_id and ad.created_at > now() - interval '1 hour')
  order by li.end_time asc limit 20;
end;
$$;


ALTER FUNCTION "public"."agent_scan_listings"("p_agent_id" "uuid", "p_goal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_expired_auctions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_item record;
  v_winning_bid record;
begin
  if not pg_try_advisory_xact_lock(42) then
    return;
  end if;

  for v_item in
    select id, seller_id, title, tenant_id
    from public.livestock_items
    where status = 'active' and end_time <= now()
    for update skip locked
    limit 50
  loop
    update public.livestock_items set status = 'ended' where id = v_item.id;

    select * into v_winning_bid
    from public.bids
    where livestock_id = v_item.id
    order by amount desc
    limit 1;

    if found then
      update public.bids set is_winner = false where livestock_id = v_item.id;
      update public.bids set is_winner = true where id = v_winning_bid.id;

      insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
      values (
        v_winning_bid.user_id, 'auction_won', 'You won!',
        'You won the auction for ' || v_item.title || ' at US$' || v_winning_bid.amount || '. Head to the listing to complete payment.',
        'high', '/payments', v_item.tenant_id
      );

      insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
      values (
        v_item.seller_id, 'auction_ending', 'Auction sold!',
        'Your listing ' || v_item.title || ' sold for US$' || v_winning_bid.amount || '.',
        'high', '/my-listings', v_item.tenant_id
      );

      insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
      select distinct b.user_id, 'auction_lost', 'Auction ended',
             'The auction for ' || v_item.title || ' has ended. The winning bid was US$' || v_winning_bid.amount || '.',
             'medium', '/item/' || v_item.id::text, v_item.tenant_id
      from public.bids b
      where b.livestock_id = v_item.id
        and b.user_id != v_winning_bid.user_id;
    else
      insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
      values (
        v_item.seller_id, 'auction_ending', 'Auction ended',
        'Your listing ' || v_item.title || ' ended with no bids.',
        'medium', '/my-listings', v_item.tenant_id
      );
    end if;
  end loop;
end;
$_$;


ALTER FUNCTION "public"."end_expired_auctions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_market_intel"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.market_intel (category, breed, location, avg_price, min_price, max_price, listing_count, avg_bid_count, sell_through_rate, period_start, period_end)
  select li.category, li.breed, li.location,
    avg(coalesce(li.current_bid, li.starting_price)), min(li.starting_price), max(coalesce(li.current_bid, li.starting_price)),
    count(*), avg(li.bid_count),
    count(*) filter (where li.status = 'sold')::numeric / nullif(count(*), 0),
    now() - interval '7 days', now()
  from public.livestock_items li where li.created_at > now() - interval '7 days'
  group by li.category, li.breed, li.location;
end;
$$;


ALTER FUNCTION "public"."generate_market_intel"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_default_tenant uuid;
begin
  insert into public.profiles (id, email, first_name, last_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );

  select id into v_default_tenant from public.tenants where slug = 'zimlivestock-demo';
  if v_default_tenant is not null then
    insert into public.tenant_members (tenant_id, user_id, role)
    values (v_default_tenant, new.id, 'buyer')
    on conflict do nothing;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_view_count"("p_item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.livestock_items
  set view_count = view_count + 1
  where id = p_item_id;
end;
$$;


ALTER FUNCTION "public"."increment_view_count"("p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_bid"("p_livestock_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_idempotency_key" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_item record;
  v_bid_id uuid;
  v_prev_bidder record;
  v_existing_bid_id uuid;
  v_bidder_verified boolean;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_bid_id
    FROM public.bids
    WHERE user_id = p_user_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_existing_bid_id IS NOT NULL THEN
      RETURN v_existing_bid_id;
    END IF;
  END IF;

  SELECT * INTO v_item
  FROM public.livestock_items
  WHERE id = p_livestock_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_item.status != 'active' THEN
    RAISE EXCEPTION 'Auction is not active';
  END IF;

  IF v_item.end_time <= now() THEN
    UPDATE public.livestock_items SET status = 'ended' WHERE id = p_livestock_id;
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  -- Demo lots allow the seller to bid (practice flow); real lots block it.
  IF v_item.seller_id = p_user_id AND NOT v_item.is_demo THEN
    RAISE EXCEPTION 'Cannot bid on your own listing';
  END IF;

  IF p_amount <= v_item.current_bid THEN
    RAISE EXCEPTION 'Bid must be higher than current bid of %', v_item.current_bid;
  END IF;

  IF p_amount < v_item.starting_price THEN
    RAISE EXCEPTION 'Bid must be at least the starting price of %', v_item.starting_price;
  END IF;

  -- Verified-bidders gate
  IF v_item.verified_bidders_only THEN
    SELECT verified INTO v_bidder_verified
    FROM public.profiles
    WHERE id = p_user_id;
    IF NOT COALESCE(v_bidder_verified, false) THEN
      RAISE EXCEPTION 'This auction requires a verified account to bid';
    END IF;
  END IF;

  INSERT INTO public.bids (livestock_id, user_id, amount, idempotency_key)
  VALUES (p_livestock_id, p_user_id, p_amount, p_idempotency_key)
  RETURNING id INTO v_bid_id;

  UPDATE public.livestock_items
  SET current_bid = p_amount,
      bid_count = bid_count + 1
  WHERE id = p_livestock_id;

  -- Skip notifications on demo lots — they generate noise with no real stakes.
  IF NOT v_item.is_demo THEN
    INSERT INTO public.notifications (user_id, type, title, message, priority, link)
    VALUES (v_item.seller_id, 'bid', 'New bid on your listing',
            'Someone bid US$' || p_amount || ' on ' || v_item.title,
            'medium', '/my-listings');

    FOR v_prev_bidder IN
      SELECT DISTINCT ON (user_id) user_id
      FROM public.bids
      WHERE livestock_id = p_livestock_id
        AND user_id != p_user_id
        AND id != v_bid_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, priority, link)
      VALUES (v_prev_bidder.user_id, 'bid', 'You''ve been outbid!',
              'A new bid of US$' || p_amount || ' was placed on ' || v_item.title || '. Place a higher bid to stay in the race!',
              'high', '/item/' || p_livestock_id::text);
    END LOOP;
  END IF;

  RETURN v_bid_id;
END;
$_$;


ALTER FUNCTION "public"."place_bid"("p_livestock_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_idempotency_key" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_bid_on_behalf"("p_livestock_id" "uuid", "p_phone" "text", "p_amount" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_user_id  uuid;
  v_item     record;
  v_bid_id   uuid;
begin
  -- Resolve phone to user
  select id into v_user_id
  from public.profiles
  where phone = p_phone
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'phone_not_registered');
  end if;

  -- Lock the item row
  select * into v_item
  from public.livestock_items
  where id = p_livestock_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'lot_not_found');
  end if;

  if v_item.status != 'active' then
    return jsonb_build_object('ok', false, 'error', 'lot_not_active');
  end if;

  if v_item.end_time <= now() then
    update public.livestock_items set status = 'ended' where id = p_livestock_id;
    return jsonb_build_object('ok', false, 'error', 'auction_ended');
  end if;

  if v_item.seller_id = v_user_id then
    return jsonb_build_object('ok', false, 'error', 'cannot_bid_own_lot');
  end if;

  if p_amount <= v_item.current_bid then
    return jsonb_build_object('ok', false, 'error', 'bid_too_low',
                              'current_bid', v_item.current_bid);
  end if;

  if p_amount < v_item.starting_price then
    return jsonb_build_object('ok', false, 'error', 'below_starting_price',
                              'starting_price', v_item.starting_price);
  end if;

  -- Insert bid
  insert into public.bids (livestock_id, user_id, amount)
  values (p_livestock_id, v_user_id, p_amount)
  returning id into v_bid_id;

  -- Update lot atomically
  update public.livestock_items
  set current_bid = p_amount,
      bid_count   = bid_count + 1
  where id = p_livestock_id;

  -- Notify seller
  insert into public.notifications (user_id, type, title, message, priority, link)
  values (v_item.seller_id, 'bid', 'New bid on your listing',
          'USSD bid of US$' || p_amount || ' on ' || v_item.title,
          'medium', '/my-listings');

  return jsonb_build_object('ok', true, 'bid_id', v_bid_id, 'amount', p_amount);
end;
$_$;


ALTER FUNCTION "public"."place_bid_on_behalf"("p_livestock_id" "uuid", "p_phone" "text", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_tenant"("p_lead_id" "uuid", "p_user_id" "uuid", "p_slug" "text", "p_name" "text", "p_config" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tenant_id uuid;
  v_lead record;
begin
  -- Verify lead is in an approvable state and not already provisioned.
  select id, status, onboard_token, approved_at
  into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found';
  end if;

  if v_lead.status = 'onboarded' then
    raise exception 'Lead is already onboarded';
  end if;

  if v_lead.onboard_token is null then
    raise exception 'Lead has not been approved';
  end if;

  -- Slug uniqueness — surfaces as a clear error rather than a generic
  -- unique-violation that the edge function would have to translate.
  if exists (select 1 from public.tenants where slug = p_slug) then
    raise exception 'Slug % is already taken', p_slug;
  end if;

  -- 1. Create the tenant
  insert into public.tenants (slug, name, config)
  values (p_slug, p_name, p_config)
  returning id into v_tenant_id;

  -- 2. Promote the new auth user to admin of this tenant
  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, p_user_id, 'admin');

  -- 3. Close out the lead
  update public.leads
  set status = 'onboarded',
      tenant_id = v_tenant_id,
      onboard_token = null  -- consume the token so the wizard URL can't replay
  where id = p_lead_id;

  return v_tenant_id;
end;
$$;


ALTER FUNCTION "public"."provision_tenant"("p_lead_id" "uuid", "p_user_id" "uuid", "p_slug" "text", "p_name" "text", "p_config" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_ownership_transition"("p_livestock_id" "uuid", "p_state" "text", "p_event" "text", "p_from_owner" "uuid" DEFAULT NULL::"uuid", "p_to_owner" "uuid" DEFAULT NULL::"uuid", "p_bid_id" "uuid" DEFAULT NULL::"uuid", "p_payment_id" "uuid" DEFAULT NULL::"uuid", "p_clearance_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_transition_id uuid;
  v_seller_id uuid;
  v_caller uuid;
  v_is_service_role boolean;
begin
  v_caller := auth.uid();
  -- When invoked via service_role key, auth.role() is 'service_role'.
  v_is_service_role := (auth.role() = 'service_role');

  -- Look up the listing's seller for the authorization check.
  select seller_id into v_seller_id
  from public.livestock_items
  where id = p_livestock_id;

  if not found then
    raise exception 'Listing not found';
  end if;

  -- Authorization: service_role bypasses; otherwise caller must be a
  -- party to this transition (from_owner, to_owner, or the seller).
  if not v_is_service_role then
    if v_caller is null then
      raise exception 'Unauthorized';
    end if;
    if v_caller <> coalesce(p_from_owner, '00000000-0000-0000-0000-000000000000'::uuid)
       and v_caller <> coalesce(p_to_owner, '00000000-0000-0000-0000-000000000000'::uuid)
       and v_caller <> v_seller_id then
      raise exception 'Unauthorized: caller must be from_owner, to_owner, or seller';
    end if;
  end if;

  insert into public.ownership_transitions (
    livestock_id, from_owner_id, to_owner_id, state, event,
    bid_id, payment_id, clearance_id, metadata
  ) values (
    p_livestock_id, p_from_owner, p_to_owner, p_state, p_event,
    p_bid_id, p_payment_id, p_clearance_id, p_metadata
  )
  returning id into v_transition_id;

  return v_transition_id;
end;
$$;


ALTER FUNCTION "public"."record_ownership_transition"("p_livestock_id" "uuid", "p_state" "text", "p_event" "text", "p_from_owner" "uuid", "p_to_owner" "uuid", "p_bid_id" "uuid", "p_payment_id" "uuid", "p_clearance_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_listing_reference"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.reference is null then
    new.reference := 'AUCT-' || lpad(nextval('public.listing_ref_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_listing_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_listing_bid"("p_livestock_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.livestock_items set
    current_bid = coalesce((select max(amount) from public.bids where livestock_id = p_livestock_id), starting_price),
    bid_count = (select count(*) from public.bids where livestock_id = p_livestock_id)
  where id = p_livestock_id;
end;
$$;


ALTER FUNCTION "public"."sync_listing_bid"("p_livestock_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tenant_immutable_field"("p_id" "uuid", "p_field" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select case p_field
    when 'slug'   then slug
    when 'name'   then name
    when 'status' then status
    else null
  end
  from public.tenants
  where id = p_id;
$$;


ALTER FUNCTION "public"."tenant_immutable_field"("p_id" "uuid", "p_field" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_role"("p_tenant" "uuid", "p_role" "text", "p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from public.tenant_members
    where tenant_id = p_tenant and user_id = p_user and role = p_role
  );
$$;


ALTER FUNCTION "public"."user_has_role"("p_tenant" "uuid", "p_role" "text", "p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_tenant_ids"("p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select distinct tenant_id from public.tenant_members where user_id = p_user;
$$;


ALTER FUNCTION "public"."user_tenant_ids"("p_user" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_bids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "goal_id" "uuid",
    "livestock_id" "uuid" NOT NULL,
    "bid_id" "uuid",
    "amount" numeric NOT NULL,
    "strategy" "text" NOT NULL,
    "status" "text" DEFAULT 'placed'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_bids_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "agent_bids_status_check" CHECK (("status" = ANY (ARRAY['placed'::"text", 'outbid'::"text", 'won'::"text", 'lost'::"text"]))),
    CONSTRAINT "agent_bids_strategy_check" CHECK (("strategy" = ANY (ARRAY['opening'::"text", 'competitive'::"text", 'snipe'::"text", 'max_bid'::"text"])))
);


ALTER TABLE "public"."agent_bids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "goal_id" "uuid",
    "livestock_id" "uuid",
    "decision" "text" NOT NULL,
    "reasoning" "text" NOT NULL,
    "confidence" numeric,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_decisions_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (100)::numeric))),
    CONSTRAINT "agent_decisions_decision_check" CHECK (("decision" = ANY (ARRAY['ignore'::"text", 'monitor'::"text", 'bid'::"text", 'buy_now'::"text", 'reprice'::"text", 'promote'::"text", 'alert'::"text", 'snipe'::"text"])))
);


ALTER TABLE "public"."agent_decisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "preferred_breed" "text",
    "preferred_location" "text",
    "min_health" "text" DEFAULT 'Fair'::"text",
    "max_price" numeric NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "quantity_fulfilled" integer DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_goals_category_check" CHECK (("category" = ANY (ARRAY['Cattle'::"text", 'Goats'::"text", 'Sheep'::"text", 'Pigs'::"text", 'Chickens'::"text", 'Other'::"text"]))),
    CONSTRAINT "agent_goals_max_price_check" CHECK (("max_price" > (0)::numeric)),
    CONSTRAINT "agent_goals_min_health_check" CHECK (("min_health" = ANY (ARRAY['Excellent'::"text", 'Good'::"text", 'Fair'::"text"]))),
    CONSTRAINT "agent_goals_preferred_location_check" CHECK ((("preferred_location" IS NULL) OR ("preferred_location" = ANY (ARRAY['Harare'::"text", 'Bulawayo'::"text", 'Mutare'::"text", 'Masvingo'::"text", 'Gweru'::"text", 'Chinhoyi'::"text", 'Kadoma'::"text", 'Kwekwe'::"text"])))),
    CONSTRAINT "agent_goals_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "agent_goals_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."agent_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_payment_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "agent_bid_id" "uuid",
    "livestock_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "method" "text" DEFAULT 'ecocash'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "last_error" "text",
    "paynow_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "paid_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL,
    CONSTRAINT "agent_payment_orders_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "agent_payment_orders_method_check" CHECK (("method" = ANY (ARRAY['ecocash'::"text", 'onemoney'::"text", 'card'::"text"]))),
    CONSTRAINT "agent_payment_orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'paid'::"text", 'failed'::"text", 'retrying'::"text"])))
);


ALTER TABLE "public"."agent_payment_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "agent_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'paused'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "stats" "jsonb" DEFAULT '{"wins": 0, "total_bids": 0, "total_spent": 0, "total_actions": 0}'::"jsonb" NOT NULL,
    "last_run_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL,
    CONSTRAINT "agents_agent_type_check" CHECK (("agent_type" = ANY (ARRAY['buyer'::"text", 'seller'::"text", 'market_intel'::"text", 'sniper'::"text"]))),
    CONSTRAINT "agents_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'stopped'::"text"])))
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestock_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "is_winner" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "idempotency_key" "uuid",
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL,
    CONSTRAINT "bids_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."bids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bill_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reference" "text" NOT NULL,
    "biller_code" "text" NOT NULL,
    "biller_name" "text" NOT NULL,
    "account_number" "text" NOT NULL,
    "account_holder" "text",
    "amount" numeric NOT NULL,
    "total_amount" numeric,
    "currency" "text" DEFAULT 'USD'::"text",
    "requires_forex" boolean DEFAULT false,
    "status" "text" DEFAULT 'pending'::"text",
    "billpay_reference" "text",
    "biller_payment_reference" "text",
    "wallet_debit_reference" "text",
    "vendor_commission" numeric DEFAULT 0,
    "vendor_service_fee" numeric DEFAULT 0,
    "vendor_service_fee_currency" "text",
    "products" "jsonb" DEFAULT '[]'::"jsonb",
    "auth_data" "jsonb",
    "vouchers" "jsonb" DEFAULT '[]'::"jsonb",
    "receipt_smses" "jsonb" DEFAULT '[]'::"jsonb",
    "receipt_html" "jsonb" DEFAULT '[]'::"jsonb",
    "display_data" "jsonb" DEFAULT '{}'::"jsonb",
    "payer_details" "jsonb",
    "narration" "text",
    "status_check_count" integer DEFAULT 0,
    "last_status_check_at" timestamp with time zone,
    "flagged_at" timestamp with time zone,
    "linked_payment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL,
    CONSTRAINT "bill_payments_amount_check" CHECK ((("amount" > (0)::numeric) AND ("amount" <= (100000)::numeric))),
    CONSTRAINT "bill_payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'authorized'::"text", 'being_processed'::"text", 'paid'::"text", 'failed'::"text", 'flagged'::"text", 'reversed'::"text"])))
);


ALTER TABLE "public"."bill_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billers_cache" (
    "biller_code" "text" NOT NULL,
    "biller_name" "text" NOT NULL,
    "description" "text",
    "icon_url" "text",
    "logo_url" "text",
    "enabled" boolean DEFAULT true,
    "member_number_field_label" "text",
    "member_number_field_desc" "text",
    "member_number_field_regex" "text",
    "allow_multiple_products" boolean DEFAULT false,
    "vendor_must_invoice" boolean DEFAULT false,
    "products" "jsonb" DEFAULT '[]'::"jsonb",
    "raw_config" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."billers_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billpay_inbound_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "member" "text",
    "paynow_reference" "text",
    "request_payload" "jsonb",
    "response_payload" "jsonb",
    "status_code" integer,
    "remote_ip" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "billpay_inbound_log_action_check" CHECK (("action" = ANY (ARRAY['member'::"text", 'pay'::"text", 'status'::"text", 'auth'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."billpay_inbound_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."billpay_inbound_log" IS 'Audit log for inbound BillPay biller API calls. Every Paynow → ZimLivestock biller call lands here.';



CREATE TABLE IF NOT EXISTS "public"."clearance_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestock_id" "uuid" NOT NULL,
    "bid_id" "uuid",
    "status" "text" NOT NULL,
    "officer_name" "text",
    "officer_badge" "text",
    "district" "text",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "idempotency_key" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "clearance_events_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."clearance_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "participant_1" "uuid" NOT NULL,
    "participant_2" "uuid" NOT NULL,
    "livestock_id" "uuid",
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "livestock_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fb_message_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "psid" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "message_type" "text" NOT NULL,
    "body" "text",
    "payload" "text",
    "state_before" "text",
    "state_after" "text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fb_message_log_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "fb_message_log_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'postback'::"text", 'quick_reply'::"text", 'template'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."fb_message_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."fb_message_log" IS 'Audit log of every Facebook bot message — inbound and outbound. Service-role only.';



CREATE TABLE IF NOT EXISTS "public"."fb_sessions" (
    "psid" "text" NOT NULL,
    "state" "text" DEFAULT 'MENU'::"text" NOT NULL,
    "draft" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "user_id" "uuid",
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fb_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."fb_sessions" IS 'Per-PSID conversation state for the Facebook Messenger bot. Service-role only.';



CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auction_house_name" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "contact_phone" "text" NOT NULL,
    "contact_email" "text" NOT NULL,
    "town" "text",
    "lots_per_week" "text" NOT NULL,
    "current_payment_rail" "text" NOT NULL,
    "biggest_friction" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "notes" "text",
    "approved_at" timestamp with time zone,
    "onboard_token" "uuid",
    "tenant_id" "uuid",
    "user_agent" "text",
    "submitted_via" "text" DEFAULT 'web_form'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "leads_auction_house_name_check" CHECK ((("char_length"("auction_house_name") >= 2) AND ("char_length"("auction_house_name") <= 200))),
    CONSTRAINT "leads_biggest_friction_check" CHECK ((("char_length"("biggest_friction") >= 10) AND ("char_length"("biggest_friction") <= 1200))),
    CONSTRAINT "leads_contact_email_check" CHECK (("contact_email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text")),
    CONSTRAINT "leads_contact_name_check" CHECK ((("char_length"("contact_name") >= 2) AND ("char_length"("contact_name") <= 120))),
    CONSTRAINT "leads_contact_phone_check" CHECK ((("char_length"("contact_phone") >= 6) AND ("char_length"("contact_phone") <= 32))),
    CONSTRAINT "leads_current_payment_rail_check" CHECK (("current_payment_rail" = ANY (ARRAY['cash_only'::"text", 'cash_and_eft'::"text", 'paynow'::"text", 'other_platform'::"text", 'mixed'::"text"]))),
    CONSTRAINT "leads_lots_per_week_check" CHECK (("lots_per_week" = ANY (ARRAY['under_50'::"text", '50_to_200'::"text", '200_plus'::"text", 'unsure'::"text"]))),
    CONSTRAINT "leads_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'contacted'::"text", 'qualified'::"text", 'onboarded'::"text", 'dropped'::"text"]))),
    CONSTRAINT "leads_town_check" CHECK (("char_length"("town") <= 80))
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."listing_ref_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."listing_ref_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_intel" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "breed" "text",
    "location" "text",
    "avg_price" numeric NOT NULL,
    "min_price" numeric NOT NULL,
    "max_price" numeric NOT NULL,
    "listing_count" integer NOT NULL,
    "avg_bid_count" numeric,
    "sell_through_rate" numeric,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."market_intel" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL,
    CONSTRAINT "messages_content_check" CHECK (("char_length"("content") <= 2000))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false,
    "priority" "text" DEFAULT 'medium'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "link" "text",
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL,
    CONSTRAINT "notifications_priority_check" CHECK (("priority" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['bid'::"text", 'message'::"text", 'auction_ending'::"text", 'auction_won'::"text", 'auction_lost'::"text", 'verification'::"text", 'payment'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ownership_transitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestock_id" "uuid" NOT NULL,
    "from_owner_id" "uuid",
    "to_owner_id" "uuid",
    "state" "text" NOT NULL,
    "event" "text" NOT NULL,
    "bid_id" "uuid",
    "payment_id" "uuid",
    "clearance_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ownership_transitions_state_check" CHECK (("state" = ANY (ARRAY['registered'::"text", 'auctioned'::"text", 'cleared'::"text", 'paid'::"text", 'transferred'::"text"])))
);


ALTER TABLE "public"."ownership_transitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "livestock_id" "uuid" NOT NULL,
    "reference" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "method" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "paynow_reference" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "idempotency_key" "uuid",
    "tenant_id" "uuid" DEFAULT "public"."default_user_tenant"() NOT NULL,
    "transport_request_id" "uuid",
    "transport_fee" numeric(10,2),
    CONSTRAINT "payments_amount_check" CHECK ((("amount" > (0)::numeric) AND ("amount" <= (100000)::numeric))),
    CONSTRAINT "payments_method_check" CHECK (("method" = ANY (ARRAY['EcoCash'::"text", 'OneMoney'::"text", 'Card'::"text", 'BillPay'::"text"]))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "avatar_url" "text",
    "verified" boolean DEFAULT false,
    "rating" numeric(2,1) DEFAULT 0,
    "sales_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "paynow_merchant_id" "text",
    CONSTRAINT "profiles_paynow_merchant_id_format" CHECK ((("paynow_merchant_id" IS NULL) OR ("paynow_merchant_id" ~ '^[0-9]{1,12}$'::"text")))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."paynow_merchant_id" IS 'Seller payout target. Paynow merchant / integration ID. When set, future settlement functions pay this seller via Paynow merchant-transfer instead of holding funds ourselves. Required before a seller can take payment on a sold lot.';



CREATE TABLE IF NOT EXISTS "public"."settlement_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_order_id" "uuid" NOT NULL,
    "event" "text" NOT NULL,
    "method" "text",
    "attempt_number" integer,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "settlement_ledger_event_check" CHECK (("event" = ANY (ARRAY['order_created'::"text", 'payment_initiated'::"text", 'payment_processing'::"text", 'payment_succeeded'::"text", 'payment_failed'::"text", 'retry_scheduled'::"text", 'retry_attempted'::"text", 'fallback_method'::"text", 'settlement_complete'::"text", 'order_cancelled'::"text", 'refund_initiated'::"text", 'live_paynow_accepted'::"text", 'live_paynow_blocked'::"text", 'live_paynow_declined'::"text"])))
);


ALTER TABLE "public"."settlement_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "phone" "text" NOT NULL,
    "message" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "provider_reference" "text",
    "cost_usd" numeric(6,4) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sms_log_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'simulated'::"text", 'failed'::"text", 'delivered'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."sms_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_members" (
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'operator'::"text", 'seller'::"text", 'buyer'::"text"])))
);


ALTER TABLE "public"."tenant_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "config" "jsonb" DEFAULT "jsonb_build_object"('commission_seller_pct', 5, 'commission_buyer_pct', 7, 'reserve_required', false, 'dispute_window_days', 3, 'lot_fee_usd', 0, 'anti_shill_window_seconds', 5, 'default_currency', 'USD') NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenants_slug_check" CHECK ((("slug" ~ '^[a-z0-9-]+$'::"text") AND (("char_length"("slug") >= 2) AND ("char_length"("slug") <= 64)))),
    CONSTRAINT "tenants_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transport_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "pickup_lat" numeric(9,6) NOT NULL,
    "pickup_lng" numeric(9,6) NOT NULL,
    "dropoff_lat" numeric(9,6) NOT NULL,
    "dropoff_lng" numeric(9,6) NOT NULL,
    "dropoff_label" "text" NOT NULL,
    "distance_km" numeric(8,2) NOT NULL,
    "quote_usd" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "transport_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'fulfilled'::"text"])))
);


ALTER TABLE "public"."transport_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ussd_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "last_text" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ussd_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wa_message_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "message_type" "text" NOT NULL,
    "body" "text",
    "media_url" "text",
    "state_before" "text",
    "state_after" "text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "wa_message_log_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "wa_message_log_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."wa_message_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."wa_message_log" IS 'Audit log of every WhatsApp bot message — inbound and outbound. Service-role only.';



CREATE TABLE IF NOT EXISTS "public"."wa_sessions" (
    "phone" "text" NOT NULL,
    "state" "text" DEFAULT 'idle'::"text" NOT NULL,
    "draft" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tenant_id" "uuid",
    "user_id" "uuid",
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "wa_sessions_state_check" CHECK (("state" = ANY (ARRAY['idle'::"text", 'awaiting_photo'::"text", 'awaiting_breed'::"text", 'awaiting_weight'::"text", 'awaiting_price'::"text", 'awaiting_confirm'::"text"])))
);


ALTER TABLE "public"."wa_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."wa_sessions" IS 'Per-phone conversation state for the WhatsApp list-my-animal bot. Service-role only.';



ALTER TABLE ONLY "public"."agent_activity_log"
    ADD CONSTRAINT "agent_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_bids"
    ADD CONSTRAINT "agent_bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_decisions"
    ADD CONSTRAINT "agent_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_goals"
    ADD CONSTRAINT "agent_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_payment_orders"
    ADD CONSTRAINT "agent_payment_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_payments"
    ADD CONSTRAINT "bill_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_payments"
    ADD CONSTRAINT "bill_payments_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."billers_cache"
    ADD CONSTRAINT "billers_cache_pkey" PRIMARY KEY ("biller_code");



ALTER TABLE ONLY "public"."billpay_inbound_log"
    ADD CONSTRAINT "billpay_inbound_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clearance_events"
    ADD CONSTRAINT "clearance_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_1_participant_2_livestock_id_key" UNIQUE ("participant_1", "participant_2", "livestock_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_livestock_id_key" UNIQUE ("user_id", "livestock_id");



ALTER TABLE ONLY "public"."fb_message_log"
    ADD CONSTRAINT "fb_message_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fb_sessions"
    ADD CONSTRAINT "fb_sessions_pkey" PRIMARY KEY ("psid");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_onboard_token_key" UNIQUE ("onboard_token");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestock_items"
    ADD CONSTRAINT "livestock_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestock_items"
    ADD CONSTRAINT "livestock_items_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."market_intel"
    ADD CONSTRAINT "market_intel_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ownership_transitions"
    ADD CONSTRAINT "ownership_transitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlement_ledger"
    ADD CONSTRAINT "settlement_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_log"
    ADD CONSTRAINT "sms_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("tenant_id", "user_id", "role");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."transport_requests"
    ADD CONSTRAINT "transport_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ussd_sessions"
    ADD CONSTRAINT "ussd_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ussd_sessions"
    ADD CONSTRAINT "ussd_sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."wa_message_log"
    ADD CONSTRAINT "wa_message_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wa_sessions"
    ADD CONSTRAINT "wa_sessions_pkey" PRIMARY KEY ("phone");



CREATE INDEX "idx_agent_activity_agent" ON "public"."agent_activity_log" USING "btree" ("agent_id", "created_at" DESC);



CREATE INDEX "idx_agent_bids_agent" ON "public"."agent_bids" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_bids_livestock" ON "public"."agent_bids" USING "btree" ("livestock_id");



CREATE INDEX "idx_agent_decisions_agent" ON "public"."agent_decisions" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_decisions_livestock" ON "public"."agent_decisions" USING "btree" ("livestock_id");



CREATE INDEX "idx_agent_goals_agent" ON "public"."agent_goals" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_pay_orders_tenant" ON "public"."agent_payment_orders" USING "btree" ("tenant_id");



CREATE INDEX "idx_agents_status" ON "public"."agents" USING "btree" ("status");



CREATE INDEX "idx_agents_tenant" ON "public"."agents" USING "btree" ("tenant_id");



CREATE INDEX "idx_agents_type" ON "public"."agents" USING "btree" ("agent_type");



CREATE INDEX "idx_agents_user" ON "public"."agents" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_bids_idempotency" ON "public"."bids" USING "btree" ("user_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_bids_livestock" ON "public"."bids" USING "btree" ("livestock_id");



CREATE INDEX "idx_bids_livestock_amount" ON "public"."bids" USING "btree" ("livestock_id", "amount" DESC);



CREATE INDEX "idx_bids_tenant" ON "public"."bids" USING "btree" ("tenant_id");



CREATE INDEX "idx_bids_user" ON "public"."bids" USING "btree" ("user_id");



CREATE INDEX "idx_bill_payments_reconcile" ON "public"."bill_payments" USING "btree" ("status", "updated_at") WHERE ("status" = ANY (ARRAY['being_processed'::"text", 'flagged'::"text"]));



CREATE INDEX "idx_bill_payments_reference" ON "public"."bill_payments" USING "btree" ("reference");



CREATE INDEX "idx_bill_payments_status" ON "public"."bill_payments" USING "btree" ("status");



CREATE INDEX "idx_bill_payments_tenant" ON "public"."bill_payments" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "idx_bill_payments_unique_active" ON "public"."bill_payments" USING "btree" ("user_id", "biller_code", "account_number") WHERE ("status" = ANY (ARRAY['pending'::"text", 'authorized'::"text", 'being_processed'::"text"]));



CREATE INDEX "idx_bill_payments_user" ON "public"."bill_payments" USING "btree" ("user_id");



CREATE INDEX "idx_billpay_inbound_log_created" ON "public"."billpay_inbound_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_billpay_inbound_log_member" ON "public"."billpay_inbound_log" USING "btree" ("member", "created_at" DESC);



CREATE INDEX "idx_billpay_inbound_log_paynow_ref" ON "public"."billpay_inbound_log" USING "btree" ("paynow_reference") WHERE ("paynow_reference" IS NOT NULL);



CREATE INDEX "idx_clearance_events_created" ON "public"."clearance_events" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "idx_clearance_events_idempotency" ON "public"."clearance_events" USING "btree" ("livestock_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_clearance_events_livestock" ON "public"."clearance_events" USING "btree" ("livestock_id");



CREATE INDEX "idx_clearance_events_status" ON "public"."clearance_events" USING "btree" ("status");



CREATE INDEX "idx_conversations_last_msg" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_p1" ON "public"."conversations" USING "btree" ("participant_1");



CREATE INDEX "idx_conversations_p2" ON "public"."conversations" USING "btree" ("participant_2");



CREATE INDEX "idx_conversations_tenant" ON "public"."conversations" USING "btree" ("tenant_id");



CREATE INDEX "idx_favorites_livestock" ON "public"."favorites" USING "btree" ("livestock_id");



CREATE INDEX "idx_favorites_tenant" ON "public"."favorites" USING "btree" ("tenant_id");



CREATE INDEX "idx_favorites_user" ON "public"."favorites" USING "btree" ("user_id");



CREATE INDEX "idx_fb_message_log_created" ON "public"."fb_message_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fb_message_log_psid" ON "public"."fb_message_log" USING "btree" ("psid", "created_at" DESC);



CREATE INDEX "idx_fb_sessions_last_message" ON "public"."fb_sessions" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_leads_email" ON "public"."leads" USING "btree" ("contact_email");



CREATE INDEX "idx_leads_status_created" ON "public"."leads" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_livestock_category" ON "public"."livestock_items" USING "btree" ("category");



CREATE INDEX "idx_livestock_end_time" ON "public"."livestock_items" USING "btree" ("end_time");



CREATE INDEX "idx_livestock_reference" ON "public"."livestock_items" USING "btree" ("reference");



CREATE INDEX "idx_livestock_seller" ON "public"."livestock_items" USING "btree" ("seller_id");



CREATE INDEX "idx_livestock_status" ON "public"."livestock_items" USING "btree" ("status");



CREATE INDEX "idx_livestock_status_category" ON "public"."livestock_items" USING "btree" ("status", "category");



CREATE INDEX "idx_livestock_status_created" ON "public"."livestock_items" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_livestock_tenant" ON "public"."livestock_items" USING "btree" ("tenant_id");



CREATE INDEX "idx_market_intel_category" ON "public"."market_intel" USING "btree" ("category", "period_end" DESC);



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_conversation_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_tenant" ON "public"."messages" USING "btree" ("tenant_id");



CREATE INDEX "idx_notifications_tenant" ON "public"."notifications" USING "btree" ("tenant_id");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_ownership_transitions_created" ON "public"."ownership_transitions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ownership_transitions_livestock" ON "public"."ownership_transitions" USING "btree" ("livestock_id");



CREATE INDEX "idx_ownership_transitions_state" ON "public"."ownership_transitions" USING "btree" ("state");



CREATE INDEX "idx_payment_orders_agent" ON "public"."agent_payment_orders" USING "btree" ("agent_id");



CREATE INDEX "idx_payment_orders_livestock" ON "public"."agent_payment_orders" USING "btree" ("livestock_id");



CREATE INDEX "idx_payment_orders_status" ON "public"."agent_payment_orders" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_payments_billpay_paynow_ref" ON "public"."payments" USING "btree" ("paynow_reference") WHERE (("method" = 'BillPay'::"text") AND ("paynow_reference" IS NOT NULL));



CREATE UNIQUE INDEX "idx_payments_idempotency" ON "public"."payments" USING "btree" ("user_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_payments_reference" ON "public"."payments" USING "btree" ("reference");



CREATE INDEX "idx_payments_tenant" ON "public"."payments" USING "btree" ("tenant_id");



CREATE INDEX "idx_payments_user" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "idx_settlement_ledger_order" ON "public"."settlement_ledger" USING "btree" ("payment_order_id", "created_at");



CREATE INDEX "idx_sms_log_created" ON "public"."sms_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sms_log_event_type" ON "public"."sms_log" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_sms_log_user" ON "public"."sms_log" USING "btree" ("user_id");



CREATE INDEX "idx_sms_log_user_recent" ON "public"."sms_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_tenant_members_tenant" ON "public"."tenant_members" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_members_user" ON "public"."tenant_members" USING "btree" ("user_id");



CREATE INDEX "idx_transport_requests_buyer" ON "public"."transport_requests" USING "btree" ("buyer_id");



CREATE INDEX "idx_transport_requests_item" ON "public"."transport_requests" USING "btree" ("item_id");



CREATE UNIQUE INDEX "idx_unique_agent_livestock_paid" ON "public"."agent_payment_orders" USING "btree" ("agent_id", "livestock_id") WHERE ("status" = 'paid'::"text");



CREATE INDEX "idx_wa_message_log_created" ON "public"."wa_message_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_wa_message_log_phone" ON "public"."wa_message_log" USING "btree" ("phone", "created_at" DESC);



CREATE INDEX "idx_wa_sessions_last_message" ON "public"."wa_sessions" USING "btree" ("last_message_at" DESC);



CREATE OR REPLACE TRIGGER "agents_updated_at" BEFORE UPDATE ON "public"."agents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "clearance_events_updated_at" BEFORE UPDATE ON "public"."clearance_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "leads_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "payment_orders_updated_at" BEFORE UPDATE ON "public"."agent_payment_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_listing_reference_trigger" BEFORE INSERT ON "public"."livestock_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_listing_reference"();



ALTER TABLE ONLY "public"."agent_activity_log"
    ADD CONSTRAINT "agent_activity_log_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_bids"
    ADD CONSTRAINT "agent_bids_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_bids"
    ADD CONSTRAINT "agent_bids_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_bids"
    ADD CONSTRAINT "agent_bids_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."agent_goals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_bids"
    ADD CONSTRAINT "agent_bids_livestock_id_fkey" FOREIGN KEY ("livestock_id") REFERENCES "public"."livestock_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_decisions"
    ADD CONSTRAINT "agent_decisions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_decisions"
    ADD CONSTRAINT "agent_decisions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."agent_goals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_decisions"
    ADD CONSTRAINT "agent_decisions_livestock_id_fkey" FOREIGN KEY ("livestock_id") REFERENCES "public"."livestock_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_goals"
    ADD CONSTRAINT "agent_goals_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_payment_orders"
    ADD CONSTRAINT "agent_payment_orders_agent_bid_id_fkey" FOREIGN KEY ("agent_bid_id") REFERENCES "public"."agent_bids"("id");



ALTER TABLE ONLY "public"."agent_payment_orders"
    ADD CONSTRAINT "agent_payment_orders_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_payment_orders"
    ADD CONSTRAINT "agent_payment_orders_livestock_id_fkey" FOREIGN KEY ("livestock_id") REFERENCES "public"."livestock_items"("id");



ALTER TABLE ONLY "public"."agent_payment_orders"
    ADD CONSTRAINT "agent_payment_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."agent_payment_orders"
    ADD CONSTRAINT "agent_payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_livestock_id_fkey" FOREIGN KEY ("livestock_id") REFERENCES "public"."livestock_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."bill_payments"
    ADD CONSTRAINT "bill_payments_linked_payment_id_fkey" FOREIGN KEY ("linked_payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."bill_payments"
    ADD CONSTRAINT "bill_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."bill_payments"
    ADD CONSTRAINT "bill_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."clearance_events"
    ADD CONSTRAINT "clearance_events_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id");



ALTER TABLE ONLY "public"."clearance_events"
    ADD CONSTRAINT "clearance_events_livestock_id_fkey" FOREIGN KEY ("livestock_id") REFERENCES "public"."livestock_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_livestock_id_fkey" FOREIGN KEY ("livestock_id") REFERENCES "public"."livestock_items"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_1_fkey" FOREIGN KEY ("participant_1") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_2_fkey" FOREIGN KEY ("participant_2") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_livestock_id_fkey" FOREIGN KEY ("livestock_id") REFERENCES "public"."livestock_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fb_sessions"
    ADD CONSTRAINT "fb_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."livestock_items"
    ADD CONSTRAINT "livestock_items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."livestock_items"
    ADD CONSTRAINT "livestock_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ownership_transitions"
    ADD CONSTRAINT "ownership_transitions_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id");



ALTER TABLE ONLY "public"."ownership_transitions"
    ADD CONSTRAINT "ownership_transitions_clearance_id_fkey" FOREIGN KEY ("clearance_id") REFERENCES "public"."clearance_events"("id");



ALTER TABLE ONLY "public"."ownership_transitions"
    ADD CONSTRAINT "ownership_transitions_from_owner_id_fkey" FOREIGN KEY ("from_owner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ownership_transitions"
    ADD CONSTRAINT "ownership_transitions_livestock_id_fkey" FOREIGN KEY ("livestock_id") REFERENCES "public"."livestock_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ownership_transitions"
    ADD CONSTRAINT "ownership_transitions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."ownership_transitions"
    ADD CONSTRAINT "ownership_transitions_to_owner_id_fkey" FOREIGN KEY ("to_owner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_livestock_id_fkey" FOREIGN KEY ("livestock_id") REFERENCES "public"."livestock_items"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_transport_request_id_fkey" FOREIGN KEY ("transport_request_id") REFERENCES "public"."transport_requests"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlement_ledger"
    ADD CONSTRAINT "settlement_ledger_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "public"."agent_payment_orders"("id");



ALTER TABLE ONLY "public"."sms_log"
    ADD CONSTRAINT "sms_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transport_requests"
    ADD CONSTRAINT "transport_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transport_requests"
    ADD CONSTRAINT "transport_requests_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."livestock_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wa_sessions"
    ADD CONSTRAINT "wa_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."wa_sessions"
    ADD CONSTRAINT "wa_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Admins manage memberships" ON "public"."tenant_members" USING ("public"."user_has_role"("tenant_id", 'admin'::"text")) WITH CHECK ("public"."user_has_role"("tenant_id", 'admin'::"text"));



CREATE POLICY "Admins update tenants" ON "public"."tenants" FOR UPDATE USING ("public"."user_has_role"("id", 'admin'::"text")) WITH CHECK ("public"."user_has_role"("id", 'admin'::"text"));



CREATE POLICY "Anyone can submit a lead" ON "public"."leads" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("status" = 'new'::"text") AND ("approved_at" IS NULL) AND ("onboard_token" IS NULL) AND ("tenant_id" IS NULL) AND ("notes" IS NULL)));



CREATE POLICY "Authenticated users can read billers cache" ON "public"."billers_cache" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Bids viewable to tenant members" ON "public"."bids" FOR SELECT USING (("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids")));



CREATE POLICY "Conversation participants can update in their tenants" ON "public"."conversations" FOR UPDATE USING (((("auth"."uid"() = "participant_1") OR ("auth"."uid"() = "participant_2")) AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Conversations viewable to participants in their tenants" ON "public"."conversations" FOR SELECT USING (((("auth"."uid"() = "participant_1") OR ("auth"."uid"() = "participant_2")) AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Listings viewable to tenant members" ON "public"."livestock_items" FOR SELECT USING (("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids")));



CREATE POLICY "Market intel is public" ON "public"."market_intel" FOR SELECT USING (true);



CREATE POLICY "Members can view their memberships" ON "public"."tenant_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Messages insertable by participants in tenant" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids")) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."participant_1" = "auth"."uid"()) OR ("c"."participant_2" = "auth"."uid"())))))));



CREATE POLICY "Messages viewable to conversation participants in tenant" ON "public"."messages" FOR SELECT USING ((("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids")) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."participant_1" = "auth"."uid"()) OR ("c"."participant_2" = "auth"."uid"())))))));



CREATE POLICY "Operators update tenant config" ON "public"."tenants" FOR UPDATE USING ("public"."user_has_role"("id", 'operator'::"text")) WITH CHECK (("public"."user_has_role"("id", 'operator'::"text") AND (NOT ("slug" IS DISTINCT FROM "public"."tenant_immutable_field"("id", 'slug'::"text"))) AND (NOT ("name" IS DISTINCT FROM "public"."tenant_immutable_field"("id", 'name'::"text"))) AND (NOT ("status" IS DISTINCT FROM "public"."tenant_immutable_field"("id", 'status'::"text")))));



CREATE POLICY "Parties can view clearance events" ON "public"."clearance_events" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."livestock_items" "li"
  WHERE (("li"."id" = "clearance_events"."livestock_id") AND ("li"."seller_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."bids" "b"
  WHERE (("b"."id" = "clearance_events"."bid_id") AND ("b"."user_id" = "auth"."uid"()) AND ("b"."is_winner" = true))))));



CREATE POLICY "Parties can view ownership transitions" ON "public"."ownership_transitions" FOR SELECT USING ((("auth"."uid"() = "from_owner_id") OR ("auth"."uid"() = "to_owner_id") OR (EXISTS ( SELECT 1
   FROM "public"."livestock_items" "li"
  WHERE (("li"."id" = "ownership_transitions"."livestock_id") AND ("li"."seller_id" = "auth"."uid"()))))));



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Recipient can mark messages as read" ON "public"."messages" FOR UPDATE USING ((("auth"."uid"() <> "sender_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids")) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."participant_1" = "auth"."uid"()) OR ("c"."participant_2" = "auth"."uid"()))))))) WITH CHECK (((NOT ("content" IS DISTINCT FROM ( SELECT "messages_1"."content"
   FROM "public"."messages" "messages_1"
  WHERE ("messages_1"."id" = "messages_1"."id")))) AND (NOT ("sender_id" IS DISTINCT FROM ( SELECT "messages_1"."sender_id"
   FROM "public"."messages" "messages_1"
  WHERE ("messages_1"."id" = "messages_1"."id"))))));



CREATE POLICY "Sellers can delete own listings" ON "public"."livestock_items" FOR DELETE USING (("auth"."uid"() = "seller_id"));



CREATE POLICY "Sellers can delete own listings with no bids" ON "public"."livestock_items" FOR DELETE USING ((("auth"."uid"() = "seller_id") AND ("bid_count" = 0) AND ("status" = 'active'::"text") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Sellers can update own listings" ON "public"."livestock_items" FOR UPDATE USING ((("auth"."uid"() = "seller_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids")))) WITH CHECK (((NOT ("current_bid" IS DISTINCT FROM ( SELECT "livestock_items_1"."current_bid"
   FROM "public"."livestock_items" "livestock_items_1"
  WHERE ("livestock_items_1"."id" = "livestock_items_1"."id")))) AND (NOT ("bid_count" IS DISTINCT FROM ( SELECT "livestock_items_1"."bid_count"
   FROM "public"."livestock_items" "livestock_items_1"
  WHERE ("livestock_items_1"."id" = "livestock_items_1"."id")))) AND (NOT ("view_count" IS DISTINCT FROM ( SELECT "livestock_items_1"."view_count"
   FROM "public"."livestock_items" "livestock_items_1"
  WHERE ("livestock_items_1"."id" = "livestock_items_1"."id")))) AND (NOT ("status" IS DISTINCT FROM ( SELECT "livestock_items_1"."status"
   FROM "public"."livestock_items" "livestock_items_1"
  WHERE ("livestock_items_1"."id" = "livestock_items_1"."id")))) AND (NOT ("end_time" IS DISTINCT FROM ( SELECT "livestock_items_1"."end_time"
   FROM "public"."livestock_items" "livestock_items_1"
  WHERE ("livestock_items_1"."id" = "livestock_items_1"."id")))) AND (NOT ("seller_id" IS DISTINCT FROM ( SELECT "livestock_items_1"."seller_id"
   FROM "public"."livestock_items" "livestock_items_1"
  WHERE ("livestock_items_1"."id" = "livestock_items_1"."id")))) AND (NOT ("tenant_id" IS DISTINCT FROM ( SELECT "livestock_items_1"."tenant_id"
   FROM "public"."livestock_items" "livestock_items_1"
  WHERE ("livestock_items_1"."id" = "livestock_items_1"."id"))))));



CREATE POLICY "Sender can update own messages" ON "public"."messages" FOR UPDATE USING ((("auth"."uid"() = "sender_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids")))) WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Tenant members can create listings" ON "public"."livestock_items" FOR INSERT WITH CHECK ((("auth"."uid"() = "seller_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Tenants viewable by members" ON "public"."tenants" FOR SELECT USING (("id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids")));



CREATE POLICY "Users can update own messages" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."participant_1" = "auth"."uid"()) OR ("c"."participant_2" = "auth"."uid"()))))));



CREATE POLICY "Users can update own payment status" ON "public"."payments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users create conversations they are part of in their tenants" ON "public"."conversations" FOR INSERT WITH CHECK ((("auth"."uid"() = "participant_1") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users create own agents in their tenants" ON "public"."agents" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users create own notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users create payments in their tenants" ON "public"."payments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users delete own agents in their tenants" ON "public"."agents" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users delete own favorites in their tenants" ON "public"."favorites" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users delete own notifications" ON "public"."notifications" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users insert own bill payments in their tenants" ON "public"."bill_payments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users insert own favorites in their tenants" ON "public"."favorites" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users manage own agents" ON "public"."agents" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users manage own goals" ON "public"."agent_goals" USING (("agent_id" IN ( SELECT "agents"."id"
   FROM "public"."agents"
  WHERE ("agents"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users see own activity" ON "public"."agent_activity_log" FOR SELECT USING (("agent_id" IN ( SELECT "agents"."id"
   FROM "public"."agents"
  WHERE ("agents"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users see own agent bids" ON "public"."agent_bids" FOR SELECT USING (("agent_id" IN ( SELECT "agents"."id"
   FROM "public"."agents"
  WHERE ("agents"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users see own decisions" ON "public"."agent_decisions" FOR SELECT USING (("agent_id" IN ( SELECT "agents"."id"
   FROM "public"."agents"
  WHERE ("agents"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users see own payment orders" ON "public"."agent_payment_orders" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users see own settlements" ON "public"."settlement_ledger" FOR SELECT USING (("payment_order_id" IN ( SELECT "agent_payment_orders"."id"
   FROM "public"."agent_payment_orders"
  WHERE ("agent_payment_orders"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users update own agents in their tenants" ON "public"."agents" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users update own notifications" ON "public"."notifications" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users view own agent payment orders in their tenants" ON "public"."agent_payment_orders" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users view own agents in their tenants" ON "public"."agents" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users view own bill payments in their tenants" ON "public"."bill_payments" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users view own favorites in their tenants" ON "public"."favorites" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users view own notifications in their tenants" ON "public"."notifications" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



CREATE POLICY "Users view own payments in their tenants" ON "public"."payments" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" IN ( SELECT "public"."user_tenant_ids"() AS "user_tenant_ids"))));



ALTER TABLE "public"."agent_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_bids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_decisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_payment_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billers_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billpay_inbound_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clearance_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fb_message_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fb_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestock_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_intel" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ownership_transitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service role full access" ON "public"."ussd_sessions" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."settlement_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sms_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sms_log_owner_read" ON "public"."sms_log" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "sms_log_service_write" ON "public"."sms_log" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."tenant_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transport_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ussd_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wa_message_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wa_sessions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."agent_place_bid"("p_agent_id" "uuid", "p_goal_id" "uuid", "p_livestock_id" "uuid", "p_amount" numeric, "p_strategy" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."agent_place_bid"("p_agent_id" "uuid", "p_goal_id" "uuid", "p_livestock_id" "uuid", "p_amount" numeric, "p_strategy" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."agent_place_bid"("p_agent_id" "uuid", "p_goal_id" "uuid", "p_livestock_id" "uuid", "p_amount" numeric, "p_strategy" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."default_user_tenant"() TO "anon";
GRANT ALL ON FUNCTION "public"."default_user_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."default_user_tenant"() TO "service_role";



GRANT ALL ON TABLE "public"."livestock_items" TO "anon";
GRANT ALL ON TABLE "public"."livestock_items" TO "authenticated";
GRANT ALL ON TABLE "public"."livestock_items" TO "service_role";



GRANT ALL ON FUNCTION "public"."agent_scan_listings"("p_agent_id" "uuid", "p_goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."agent_scan_listings"("p_agent_id" "uuid", "p_goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."agent_scan_listings"("p_agent_id" "uuid", "p_goal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_expired_auctions"() TO "anon";
GRANT ALL ON FUNCTION "public"."end_expired_auctions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_expired_auctions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_market_intel"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_market_intel"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_market_intel"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_view_count"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_view_count"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_view_count"("p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."place_bid"("p_livestock_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_idempotency_key" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."place_bid"("p_livestock_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_idempotency_key" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_bid"("p_livestock_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_idempotency_key" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."place_bid_on_behalf"("p_livestock_id" "uuid", "p_phone" "text", "p_amount" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."place_bid_on_behalf"("p_livestock_id" "uuid", "p_phone" "text", "p_amount" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."provision_tenant"("p_lead_id" "uuid", "p_user_id" "uuid", "p_slug" "text", "p_name" "text", "p_config" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_tenant"("p_lead_id" "uuid", "p_user_id" "uuid", "p_slug" "text", "p_name" "text", "p_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."provision_tenant"("p_lead_id" "uuid", "p_user_id" "uuid", "p_slug" "text", "p_name" "text", "p_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_tenant"("p_lead_id" "uuid", "p_user_id" "uuid", "p_slug" "text", "p_name" "text", "p_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_ownership_transition"("p_livestock_id" "uuid", "p_state" "text", "p_event" "text", "p_from_owner" "uuid", "p_to_owner" "uuid", "p_bid_id" "uuid", "p_payment_id" "uuid", "p_clearance_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_ownership_transition"("p_livestock_id" "uuid", "p_state" "text", "p_event" "text", "p_from_owner" "uuid", "p_to_owner" "uuid", "p_bid_id" "uuid", "p_payment_id" "uuid", "p_clearance_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_ownership_transition"("p_livestock_id" "uuid", "p_state" "text", "p_event" "text", "p_from_owner" "uuid", "p_to_owner" "uuid", "p_bid_id" "uuid", "p_payment_id" "uuid", "p_clearance_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_listing_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_listing_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_listing_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_listing_bid"("p_livestock_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_listing_bid"("p_livestock_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_listing_bid"("p_livestock_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."tenant_immutable_field"("p_id" "uuid", "p_field" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tenant_immutable_field"("p_id" "uuid", "p_field" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."tenant_immutable_field"("p_id" "uuid", "p_field" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."tenant_immutable_field"("p_id" "uuid", "p_field" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_role"("p_tenant" "uuid", "p_role" "text", "p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_role"("p_tenant" "uuid", "p_role" "text", "p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_role"("p_tenant" "uuid", "p_role" "text", "p_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_tenant_ids"("p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_tenant_ids"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_tenant_ids"("p_user" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."agent_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."agent_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."agent_bids" TO "anon";
GRANT ALL ON TABLE "public"."agent_bids" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_bids" TO "service_role";



GRANT ALL ON TABLE "public"."agent_decisions" TO "anon";
GRANT ALL ON TABLE "public"."agent_decisions" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_decisions" TO "service_role";



GRANT ALL ON TABLE "public"."agent_goals" TO "anon";
GRANT ALL ON TABLE "public"."agent_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_goals" TO "service_role";



GRANT ALL ON TABLE "public"."agent_payment_orders" TO "anon";
GRANT ALL ON TABLE "public"."agent_payment_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_payment_orders" TO "service_role";



GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON TABLE "public"."bids" TO "anon";
GRANT ALL ON TABLE "public"."bids" TO "authenticated";
GRANT ALL ON TABLE "public"."bids" TO "service_role";



GRANT ALL ON TABLE "public"."bill_payments" TO "anon";
GRANT ALL ON TABLE "public"."bill_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_payments" TO "service_role";



GRANT ALL ON TABLE "public"."billers_cache" TO "anon";
GRANT ALL ON TABLE "public"."billers_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."billers_cache" TO "service_role";



GRANT ALL ON TABLE "public"."billpay_inbound_log" TO "anon";
GRANT ALL ON TABLE "public"."billpay_inbound_log" TO "authenticated";
GRANT ALL ON TABLE "public"."billpay_inbound_log" TO "service_role";



GRANT ALL ON TABLE "public"."clearance_events" TO "anon";
GRANT ALL ON TABLE "public"."clearance_events" TO "authenticated";
GRANT ALL ON TABLE "public"."clearance_events" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."favorites" TO "anon";
GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";



GRANT ALL ON TABLE "public"."fb_message_log" TO "anon";
GRANT ALL ON TABLE "public"."fb_message_log" TO "authenticated";
GRANT ALL ON TABLE "public"."fb_message_log" TO "service_role";



GRANT ALL ON TABLE "public"."fb_sessions" TO "anon";
GRANT ALL ON TABLE "public"."fb_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."fb_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON SEQUENCE "public"."listing_ref_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."listing_ref_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."listing_ref_seq" TO "service_role";



GRANT ALL ON TABLE "public"."market_intel" TO "anon";
GRANT ALL ON TABLE "public"."market_intel" TO "authenticated";
GRANT ALL ON TABLE "public"."market_intel" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."ownership_transitions" TO "anon";
GRANT ALL ON TABLE "public"."ownership_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."ownership_transitions" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."settlement_ledger" TO "anon";
GRANT ALL ON TABLE "public"."settlement_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."settlement_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."sms_log" TO "anon";
GRANT ALL ON TABLE "public"."sms_log" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_log" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_members" TO "anon";
GRANT ALL ON TABLE "public"."tenant_members" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_members" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."transport_requests" TO "anon";
GRANT ALL ON TABLE "public"."transport_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."transport_requests" TO "service_role";



GRANT ALL ON TABLE "public"."ussd_sessions" TO "anon";
GRANT ALL ON TABLE "public"."ussd_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."ussd_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."wa_message_log" TO "anon";
GRANT ALL ON TABLE "public"."wa_message_log" TO "authenticated";
GRANT ALL ON TABLE "public"."wa_message_log" TO "service_role";



GRANT ALL ON TABLE "public"."wa_sessions" TO "anon";
GRANT ALL ON TABLE "public"."wa_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."wa_sessions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








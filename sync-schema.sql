create table public.ahmed_sync_documents (
 workspace text not null check (workspace in ('main','preview-sync-v1')),
 key text not null check (length(key) between 1 and 200),
 value jsonb,
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 primary key(workspace,key)
);
create table public.ahmed_sync_versions (
 id uuid primary key default gen_random_uuid(),
 workspace text not null check (workspace in ('main','preview-sync-v1')),
 key text not null,
 value jsonb,
 revision bigint not null,
 created_at timestamptz not null default now()
);
create index ahmed_sync_versions_lookup on public.ahmed_sync_versions(workspace,key,created_at desc);
alter table public.ahmed_sync_documents enable row level security;
alter table public.ahmed_sync_versions enable row level security;
revoke all on public.ahmed_sync_documents,public.ahmed_sync_versions from public,anon,authenticated;
grant select,insert,update on public.ahmed_sync_documents to anon,authenticated;
grant select,insert on public.ahmed_sync_versions to anon,authenticated;
create policy ahmed_shared_read on public.ahmed_sync_documents for select to anon,authenticated using (workspace in ('main','preview-sync-v1'));
create policy ahmed_shared_insert on public.ahmed_sync_documents for insert to anon,authenticated with check (workspace in ('main','preview-sync-v1'));
create policy ahmed_shared_update on public.ahmed_sync_documents for update to anon,authenticated using (workspace in ('main','preview-sync-v1')) with check (workspace in ('main','preview-sync-v1'));
create policy ahmed_versions_read on public.ahmed_sync_versions for select to anon,authenticated using (workspace in ('main','preview-sync-v1'));
create policy ahmed_versions_insert on public.ahmed_sync_versions for insert to anon,authenticated with check (workspace in ('main','preview-sync-v1'));
create function public.ahmed_sync_history() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and (new.workspace<>old.workspace or new.key<>old.key or new.revision<>old.revision+1) then raise exception 'Invalid revision'; end if;
 insert into public.ahmed_sync_versions(workspace,key,value,revision) values(new.workspace,new.key,new.value,new.revision);
 return new;
end;$$;
revoke all on function public.ahmed_sync_history() from public,anon,authenticated;
create trigger ahmed_sync_history after insert or update on public.ahmed_sync_documents for each row execute function public.ahmed_sync_history();
create function public.ahmed_sync_put(p_workspace text,p_key text,p_expected bigint,p_value jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.ahmed_sync_documents; changed boolean:=false;
begin
 if p_key not in ('ahmed-life-lab-v1','ahmed-daily-notes-v1','ahmed-writing-books-v2','ahmed-writing-preferences-v2','ahmed-theme','ahmed-class-sort','ahmed-psychology-study-v1','ahmed-psychology-class-notes-20261022-v1') and p_key not like 'art:%' and p_key not like 'recovery:%' then raise exception 'Unknown document'; end if;
 if octet_length(p_value::text)>25000000 then raise exception 'Document too large'; end if;
 if p_expected=0 then
  insert into public.ahmed_sync_documents(workspace,key,value) values(p_workspace,p_key,p_value) on conflict do nothing returning * into d;
  changed=found;
 else
  update public.ahmed_sync_documents set value=p_value,revision=revision+1,updated_at=now() where workspace=p_workspace and key=p_key and revision=p_expected returning * into d;
  changed=found;
 end if;
 if not changed then select * into d from public.ahmed_sync_documents where workspace=p_workspace and key=p_key; end if;
 return jsonb_build_object('ok',changed,'document',to_jsonb(d));
end;$$;
revoke all on function public.ahmed_sync_put(text,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.ahmed_sync_put(text,text,bigint,jsonb) to anon,authenticated;

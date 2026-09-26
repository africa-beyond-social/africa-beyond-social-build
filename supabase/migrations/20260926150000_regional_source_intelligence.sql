-- WIGOD Newsroom: regional publisher intelligence for Zimbabwe and South Africa.
-- Stores canonical publisher identity separately from feed/source identity.

alter table public.news_sources
  add column if not exists country text,
  add column if not exists publisher_name text,
  add column if not exists aliases jsonb not null default '[]'::jsonb,
  add column if not exists priority_rank integer not null default 10;

alter table public.newsroom_stories
  add column if not exists publisher_name text,
  add column if not exists publisher_country text;

update public.news_sources set priority_rank=case priority when 'critical' then 100 when 'high' then 70 when 'standard' then 40 when 'archive' then 10 else 20 end;

update public.news_sources
set priority='high', priority_rank=70, country='Zimbabwe'
where name in ('Google News — Zimbabwe','Google News — Zimbabwe Politics & Public Affairs');

update public.news_sources
set priority='high', priority_rank=70, country='Africa'
where name='Google News — Africa';

insert into public.news_sources
(name, source_type, url, active, monitoring_enabled, priority, country, publisher_name, aliases, priority_rank, focus_areas)
values
('Google News — Zimbabwe Politics','google_news','https://news.google.com/rss/search?q=Zimbabwe%20politics%20government%20Parliament%20president%20cabinet%20when%3A2d&hl=en-ZW&gl=ZW&ceid=ZW%3Aen',true,true,'critical','Zimbabwe','Google News','["Zimbabwe","politics","government","Parliament"]'::jsonb,95,'["politics","government","parliament"]'::jsonb),
('Google News — Zimbabwe Business & Economy','google_news','https://news.google.com/rss/search?q=Zimbabwe%20business%20economy%20mining%20finance%20trade%20industry%20when%3A2d&hl=en-ZW&gl=ZW&ceid=ZW%3Aen',true,true,'critical','Zimbabwe','Google News','["Zimbabwe","business","economy","mining","finance"]'::jsonb,95,'["business","economy","mining","finance"]'::jsonb),
('Google News — Zimbabwe Local & Community','google_news','https://news.google.com/rss/search?q=Zimbabwe%20local%20community%20Bulawayo%20Harare%20Masvingo%20Manicaland%20Matabeleland%20when%3A2d&hl=en-ZW&gl=ZW&ceid=ZW%3Aen',true,true,'high','Zimbabwe','Google News','["Zimbabwe","local","community","Harare","Bulawayo","Masvingo"]'::jsonb,90,'["local","community"]'::jsonb),
('Google News — Zimbabwe Courts & Crime','google_news','https://news.google.com/rss/search?q=Zimbabwe%20courts%20crime%20police%20justice%20when%3A2d&hl=en-ZW&gl=ZW&ceid=ZW%3Aen',true,true,'high','Zimbabwe','Google News','["Zimbabwe","courts","crime","police","justice"]'::jsonb,90,'["courts","crime","justice"]'::jsonb),
('Google News — Zimbabwe Health Agriculture & Environment','google_news','https://news.google.com/rss/search?q=Zimbabwe%20health%20agriculture%20farming%20environment%20drought%20hospitals%20when%3A2d&hl=en-ZW&gl=ZW&ceid=ZW%3Aen',true,true,'high','Zimbabwe','Google News','["Zimbabwe","health","agriculture","environment","drought"]'::jsonb,90,'["health","agriculture","environment"]'::jsonb),
('Google News — Zimbabwe Sport','google_news','https://news.google.com/rss/search?q=Zimbabwe%20sport%20cricket%20football%20rugby%20athletics%20when%3A2d&hl=en-ZW&gl=ZW&ceid=ZW%3Aen',true,true,'high','Zimbabwe','Google News','["Zimbabwe","sport","cricket","football","rugby","athletics"]'::jsonb,90,'["sport"]'::jsonb),
('Google News — South Africa Politics','google_news','https://news.google.com/rss/search?q=South%20Africa%20politics%20government%20Parliament%20president%20cabinet%20when%3A2d&hl=en-ZA&gl=ZA&ceid=ZA%3Aen',true,true,'critical','South Africa','Google News','["South Africa","politics","government","Parliament"]'::jsonb,95,'["politics","government","parliament"]'::jsonb),
('Google News — South Africa Business & Economy','google_news','https://news.google.com/rss/search?q=South%20Africa%20business%20economy%20markets%20mining%20finance%20trade%20industry%20when%3A2d&hl=en-ZA&gl=ZA&ceid=ZA%3Aen',true,true,'critical','South Africa','Google News','["South Africa","business","economy","mining","finance"]'::jsonb,95,'["business","economy","mining","finance"]'::jsonb),
('Google News — South Africa Local & Community','google_news','https://news.google.com/rss/search?q=South%20Africa%20local%20community%20Johannesburg%20Cape%20Town%20Durban%20Gauteng%20when%3A2d&hl=en-ZA&gl=ZA&ceid=ZA%3Aen',true,true,'high','South Africa','Google News','["South Africa","local","community","Johannesburg","Cape Town","Durban","Gauteng"]'::jsonb,90,'["local","community"]'::jsonb),
('Google News — South Africa Courts & Crime','google_news','https://news.google.com/rss/search?q=South%20Africa%20courts%20crime%20police%20justice%20when%3A2d&hl=en-ZA&gl=ZA&ceid=ZA%3Aen',true,true,'high','South Africa','Google News','["South Africa","courts","crime","police","justice"]'::jsonb,90,'["courts","crime","justice"]'::jsonb),
('Google News — South Africa Health Agriculture & Environment','google_news','https://news.google.com/rss/search?q=South%20Africa%20health%20agriculture%20farming%20environment%20drought%20hospitals%20when%3A2d&hl=en-ZA&gl=ZA&ceid=ZA%3Aen',true,true,'high','South Africa','Google News','["South Africa","health","agriculture","environment","drought"]'::jsonb,90,'["health","agriculture","environment"]'::jsonb),
('Google News — South Africa Sport','google_news','https://news.google.com/rss/search?q=South%20Africa%20sport%20cricket%20football%20rugby%20athletics%20when%3A2d&hl=en-ZA&gl=ZA&ceid=ZA%3Aen',true,true,'high','South Africa','Google News','["South Africa","sport","cricket","football","rugby","athletics"]'::jsonb,90,'["sport"]'::jsonb)
on conflict do nothing;

create index if not exists news_sources_priority_country_idx
  on public.news_sources (priority, country, active, monitoring_enabled);

create index if not exists newsroom_stories_publisher_country_idx
  on public.newsroom_stories (publisher_country, publisher_name, detected_at desc);

create index if not exists news_sources_country_rank_idx
  on public.news_sources (country, priority_rank desc, active, monitoring_enabled);

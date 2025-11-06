-- Opret one_rep_maxes tabel til at gemme 1RM værdier
create table one_rep_maxes (
  id uuid primary key default uuid_generate_v4(),
  exercise_name text not null,
  one_rm decimal(5,2) not null,
  date date not null default current_date,
  created_at timestamp with time zone default now()
);

-- Tilføj index for hurtigere søgning
create index idx_one_rep_maxes_exercise on one_rep_maxes(exercise_name);
create index idx_one_rep_maxes_date on one_rep_maxes(date);

-- Indsæt demo data (valgfrit)
insert into one_rep_maxes (exercise_name, one_rm, date) values
  ('Bench Press', 100.0, current_date),
  ('Squat', 140.0, current_date),
  ('Deadlift', 180.0, current_date),
  ('Overhead Press', 70.0, current_date),
  ('Bent Over Row', 90.0, current_date);

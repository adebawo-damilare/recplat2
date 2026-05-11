import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.release" });

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL missing in .env.release");
}

const sql = postgres(process.env.DATABASE_URL);

const users = await sql`
  select id, email
  from users
  where email like 'prod-check-%@example.test'
`;
const deleted = { applications: 0, vacancies: 0, users: 0 };

if (users.length > 0) {
  for (const u of users) {
    const appsByCandidate = await sql`
      delete from applications
      where candidate_user_id = ${u.id}
      returning id
    `;
    deleted.applications += appsByCandidate.length;

    const appsByVacancy = await sql`
      delete from applications
      where vacancy_id in (
        select id from vacancies where posted_by_user_id = ${u.id}
      )
      returning id
    `;
    deleted.applications += appsByVacancy.length;

    const vacanciesByOwner = await sql`
      delete from vacancies
      where posted_by_user_id = ${u.id}
      returning id
    `;
    deleted.vacancies += vacanciesByOwner.length;

    const deletedUsers = await sql`
      delete from users
      where id = ${u.id}
      returning id
    `;
    deleted.users += deletedUsers.length;
  }
}

const appsByMarker = await sql`
  delete from applications
  where vacancy_id in (
    select id
    from vacancies
    where job_title = 'Prod Checklist Vacancy'
      and company_name_denorm = 'Checklist Labs'
  )
  returning id
`;
deleted.applications += appsByMarker.length;

const vacanciesByMarker = await sql`
  delete from vacancies
  where job_title = 'Prod Checklist Vacancy'
    and company_name_denorm = 'Checklist Labs'
  returning id
`;
deleted.vacancies += vacanciesByMarker.length;

await sql.end();

console.log(
  JSON.stringify(
    {
      matchedUsers: users.map((u) => u.email),
      deleted,
    },
    null,
    2,
  ),
);

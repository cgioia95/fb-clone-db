# FB-CLONE-DB

## Docker-Compose Network

- Can spin up a local DB instance, and then run the migrations/seeds on it using docker-compose
- Spin up the containers: `docker-compose up --build`
- Ensure all existing containers are down: `docker-compose down --volumes`

## From local terminal

- You can just specifically spin up the database with `docker-compose up psql`
- Then can seperately run migrations and seeding by
  - `npm run migrate`
  - `npm run seed`

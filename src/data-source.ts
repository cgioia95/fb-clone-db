import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "fb_clone_db",
  synchronize: false,
  logging: false,
  entities: [User],
  migrations: ["src/migrations/**/*.ts"], // Specify the migrations path
  migrationsTableName: "migrations",
  subscribers: [],
  migrationsRun: true,
});

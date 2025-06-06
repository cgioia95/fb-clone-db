require("dotenv").config();
import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";

const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;
const host = process.env.DB_HOST;
const dbName = process.env.DB_NAME;

export const AppDataSource = new DataSource({
  type: "postgres",
  host,
  port: 5432,
  username,
  password,
  database: dbName,
  synchronize: false,
  logging: false,
  entities: [User],
  migrations: ["src/migrations/**/*.ts"], // Specify the migrations path
  migrationsTableName: "migrations",
  subscribers: [],
  migrationsRun: false,
});

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let connection;

const connectMySQL = async () => {
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });

    console.log("✅ MySQL Connected");
  } catch (error) {
    console.error("❌ MySQL Connection Error:", error.message);
    process.exit(1);
  }
};

export const disconnectMySQL = async () => {
  try {
    if (connection) {
      await connection.end();
      console.log("✅ MySQL Disconnected");
    }
  } catch (error) {
    console.error("❌ MySQL Disconnect Error:", error.message);
  }
};

export { connection };
export default connectMySQL;
// import mysql from "mysql2/promise"

// const connectToMySQLDB = async () => {
//     const connection = await mysql.createConnection({
//         host : process.env.MYSQL_HOST,
//         user : process.env.MYSQL_USER,
//         password : process.env.MYSQL_PASSWORD,
//         database : process.env.MYSQL_DB
//     });

//     try {
//         const [rows] = await connection.execute('SELECT username FROM user')
//         console.log(rows)
//     } catch (error) {
//         console.log('쿼리 실행 중 오류 발생: ', error)
//     } finally {
//         await connection.end();
//     }
// }

// export default connectToMySQLDB;

import mysql from "mysql2/promise";

let pool;

const createMySQLPool = () => {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  return pool;
};

const getConnection = async () => {
  if (!pool) createMySQLPool();
  return pool.getConnection();
};

const query = async (sql, params) => {
  const connection = await getConnection();
  try {
    const [results] = await connection.query(sql, params);
    return results;
  } finally {
    connection.release();
  }
};

const connectToMySQLDB = async () => {
  try {
    await getConnection();
    console.log('MySQL 연결 풀이 성공적으로 생성되었습니다.');
    
    // 연결 테스트
    const testResult = await query('SELECT 1 + 1 AS result');
    console.log('연결 테스트 결과:', testResult);
  } catch (error) {
    console.error('MySQL 연결 풀 생성 중 오류 발생:', error);
  }
};

export { connectToMySQLDB, query };
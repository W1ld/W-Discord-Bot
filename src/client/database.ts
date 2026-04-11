import mysql from 'mysql2/promise';
import 'dotenv/config';

export const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionLimit: 1, // Crucial for shared hosting
    connectTimeout: 10000,
    waitForConnections: true,
    enableKeepAlive: true,
};

export class DatabaseClient {
    private pool = mysql.createPool(dbConfig);

    async testConnection(retries = 3): Promise<boolean> {
        for (let i = 0; i < retries; i++) {
            try {
                const connection = await this.pool.getConnection();
                console.log('✅ Database connected successfully to bot-hosting.net!');
                connection.release();
                return true;
            } catch (error) {
                console.error(`⚠️ Database connection attempt ${i + 1} failed:`, (error as Error).message);
                if (i < retries - 1) {
                    console.log('🔄 Retrying in 2 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    console.error('❌ All database connection attempts failed.');
                }
            }
        }
        return false;
    }

    async init() {
        try {
            await this.query(`
                CREATE TABLE IF NOT EXISTS mementos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    guild_id VARCHAR(255) NOT NULL,
                    channel_id VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    unlock_at DATETIME NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Database tables initialized successfully.');
        } catch (error) {
            console.error('❌ Failed to initialize database tables:', error);
        }
    }

    async query(sql: string, params?: any[]) {
        const [results] = await this.pool.execute(sql, params);
        return results;
    }
}

export const db = new DatabaseClient();

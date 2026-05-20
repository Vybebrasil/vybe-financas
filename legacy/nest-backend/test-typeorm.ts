import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('Testing TypeORM DataSource...');

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'vybe_financas',
    entities: [__dirname + '/src/**/*.entity.ts'], // Pointing to TS files assuming ts-node
    synchronize: true,
    logging: false,
});

AppDataSource.initialize()
    .then(() => {
        console.log('Data Source has been initialized!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error during Data Source initialization:', err);
        process.exit(1);
    });

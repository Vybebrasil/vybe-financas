import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { FinanceModule } from './modules/finance/finance.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { EntitiesMgmtModule } from './modules/entities_mgmt/entities-mgmt.module';

@Module({
    imports: [
        TypeOrmModule.forRoot(typeOrmConfig),
        FinanceModule,
        CompaniesModule,
        EntitiesMgmtModule
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }

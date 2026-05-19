import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessEntity } from './entities/business-entity.entity';
import { BusinessEntityService } from './services/business-entity.service';
import { BusinessEntityController } from './controllers/business-entity.controller';

@Module({
    imports: [TypeOrmModule.forFeature([BusinessEntity])],
    controllers: [BusinessEntityController],
    providers: [BusinessEntityService],
    exports: [BusinessEntityService],
})
export class EntitiesMgmtModule { }

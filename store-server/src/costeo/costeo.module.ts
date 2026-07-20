import { Module } from "@nestjs/common";
import { CosteoController } from "./costeo.controller";
import { CosteoService } from "./costeo.service";

@Module({
  controllers: [CosteoController],
  providers: [CosteoService],
  exports: [CosteoService],
})
export class CosteoModule {}

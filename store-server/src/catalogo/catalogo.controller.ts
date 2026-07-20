import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { CatalogoService } from "./catalogo.service";
import {
  ActualizarInsumoDto,
  ActualizarProductoDto,
  CrearCategoriaDto,
  CrearComboDto,
  CrearGrupoModificadorDto,
  CrearInsumoDto,
  CrearModificadorDto,
  CrearProductoDto,
  CrearRecetaDto,
  CrearRecetaInsumoDto,
  CrearRecetaModificadorDto,
  MarcarUsuarioDto,
} from "./dto/catalogo.dto";

@Controller("api/v1")
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Get("catalogo")
  obtenerCatalogo() {
    return this.catalogo.obtenerCatalogoCompleto();
  }

  @Post("categorias")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  crearCategoria(@Body() dto: CrearCategoriaDto) {
    return this.catalogo.crearCategoria(dto);
  }

  @Post("productos")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  crearProducto(@Body() dto: CrearProductoDto) {
    return this.catalogo.crearProducto(dto);
  }

  @Patch("productos/:id")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  actualizarProducto(@Param("id") id: string, @Body() dto: ActualizarProductoDto) {
    return this.catalogo.actualizarProducto(id, dto);
  }

  @Post("productos/:id/86")
  @RequierePermiso(PERMISOS.PRODUCTO_MARCAR_86)
  marcar86(
    @Param("id") id: string,
    @Body() dto: MarcarUsuarioDto,
    @Headers("x-usuario-id") usuarioId?: string,
  ) {
    return this.catalogo.marcar86(id, usuarioId ?? null, dto.motivo);
  }

  @Post("productos/:id/reactivar")
  @RequierePermiso(PERMISOS.PRODUCTO_MARCAR_86)
  reactivar(
    @Param("id") id: string,
    @Body() dto: MarcarUsuarioDto,
    @Headers("x-usuario-id") usuarioId?: string,
  ) {
    return this.catalogo.reactivar(id, usuarioId ?? null, dto.motivo);
  }

  @Post("combos")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  crearCombo(@Body() dto: CrearComboDto) {
    return this.catalogo.crearCombo(dto);
  }

  @Post("grupos-modificador")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  crearGrupoModificador(@Body() dto: CrearGrupoModificadorDto) {
    return this.catalogo.crearGrupoModificador(dto);
  }

  @Post("modificadores")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  crearModificador(@Body() dto: CrearModificadorDto) {
    return this.catalogo.crearModificador(dto);
  }

  @Post("insumos")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  crearInsumo(@Body() dto: CrearInsumoDto) {
    return this.catalogo.crearInsumo(dto);
  }

  @Patch("insumos/:id")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  actualizarInsumo(@Param("id") id: string, @Body() dto: ActualizarInsumoDto) {
    return this.catalogo.actualizarInsumo(id, dto);
  }

  @Post("modificadores/:id/receta-modificador")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  agregarRecetaModificador(@Param("id") id: string, @Body() dto: CrearRecetaModificadorDto) {
    return this.catalogo.agregarRecetaModificador(id, dto);
  }

  @Post("recetas")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  crearReceta(@Body() dto: CrearRecetaDto) {
    return this.catalogo.crearReceta(dto);
  }

  @Post("recetas/:id/insumos")
  @RequierePermiso(PERMISOS.CATALOGO_GESTIONAR)
  agregarRecetaInsumo(@Param("id") id: string, @Body() dto: CrearRecetaInsumoDto) {
    return this.catalogo.agregarRecetaInsumo(id, dto);
  }
}

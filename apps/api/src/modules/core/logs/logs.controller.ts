import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { ApiResponse } from '../interfaces/api-response.interface';

type Severidad = 'info' | 'warn' | 'error';

interface ClientErrorBody {
    kind?: string;
    title?: string;
    message?: string;
    status?: number;
    url?: string;
    method?: string;
    contexto?: string;
    userAgent?: string;
    userId?: string;
    stack?: string;
    occurredAt?: string;
}

const MAX_LEN = 2000;

/**
 * Errores que ocurren en el navegador y nunca llegan al servidor por si solas:
 * timeouts, caida de red, errores de JavaScript. Sin este endpoint son
 * invisibles desde la consola del back, que es justo donde no se ven.
 *
 * Es publico a proposito: cuando la sesion expiro el token ya no sirve, y ese
 * es justo uno de los momentos que mas conviene tener registrado. No escribe
 * en base de datos, solo emite log.
 */
@Controller('logs')
export class LogsController {
    private readonly logger = new Logger('Cliente');

    @Public()
    @Post('client-error')
    @HttpCode(HttpStatus.NO_CONTENT)
    registrarError(@Body() body: ClientErrorBody) {
        const severidad: Severidad = body.status && body.status < 500 ? 'warn' : 'error';
        const truncar = (v: any) => (typeof v === 'string' ? v.slice(0, MAX_LEN) : v);

        const partes = [
            `[${body.method || '?'} ${body.url || '?'}]`,
            `tipo=${body.kind || 'desconocido'}`,
            body.status ? `status=${body.status}` : null,
            `titulo=${truncar(body.title)}`,
            `mensaje=${truncar(body.message)}`,
            body.contexto ? `contexto=${truncar(body.contexto)}` : null,
            body.userId ? `usuario=${body.userId}` : null,
            `cuando=${body.occurredAt || new Date().toISOString()}`,
        ].filter(Boolean);

        const linea = partes.join(' | ');

        if (severidad === 'error') {
            this.logger.error(linea, body.stack);
        } else {
            this.logger.warn(linea);
        }

        return;
    }
}

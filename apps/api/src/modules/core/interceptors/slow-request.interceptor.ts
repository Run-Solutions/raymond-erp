import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Marca en consola las peticiones que tardaron mas del umbral. Por defecto viene
 * DESACTIVADO (los endpoints R4 de esta BD superan 1500ms de forma normal y solo
 * llenaba el log de ruido). Para diagnostica de lentitud se activa con
 * SLOW_REQUEST_MS=<milisegundos>; 0 lo mantiene apagado.
 */
@Injectable()
export class SlowRequestInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Rendimiento');
    private readonly umbral = Number(process.env.SLOW_REQUEST_MS ?? 0);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (this.umbral <= 0) {
            return next.handle();
        }

        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();

        // OPTIONS (CORS) y el propio endpoint de logs: ruido, no informacion.
        if (req.method === 'OPTIONS' || req.url?.includes('/logs/client-error')) {
            return next.handle();
        }

        const inicio = Date.now();

        return next.handle().pipe(
            tap({
                next: () => this.registrar(req, res, inicio),
                error: () => this.registrar(req, res, inicio),
            }),
        );
    }

    private registrar(req: any, res: any, inicio: number) {
        const ms = Date.now() - inicio;
        if (ms < this.umbral) return;

        const status = res?.statusCode ?? 0;
        const etiqueta = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'LENTO';

        this.logger.warn(
            `${etiqueta} [${req.method}] ${req.originalUrl ?? req.url} -> ${status} en ${ms}ms (umbral ${this.umbral}ms)`,
        );
    }
}

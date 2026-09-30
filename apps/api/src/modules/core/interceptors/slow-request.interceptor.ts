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
 * Marca en consola las peticiones que tardaron mas del umbral. Sin esto no hay
 * forma de saber que endpoint se puso lento: solo se ve que "algo" se siente
 * lento. El umbral se ajusta con SLOW_REQUEST_MS; 0 desactiva el registro.
 */
@Injectable()
export class SlowRequestInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Rendimiento');
    private readonly umbral = Number(process.env.SLOW_REQUEST_MS ?? 1500);

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

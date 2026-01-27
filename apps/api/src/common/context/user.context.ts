import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface UserContextData {
    id: string;
    roles: string;
    isSuperadmin?: boolean;
}

@Injectable()
export class UserContext {
    private static readonly storage = new AsyncLocalStorage<UserContextData>();

    static setUser(user: UserContextData) {
        this.storage.enterWith(user);
    }

    static getUser(): UserContextData | undefined {
        return this.storage.getStore();
    }

    static isSuperadmin(): boolean {
        const user = this.getUser();
        const result = user?.isSuperadmin === true || user?.roles === 'Superadmin';
        console.log(`[UserContext.isSuperadmin] User: ${JSON.stringify(user)}, Result: ${result}`);
        return result;
    }
}


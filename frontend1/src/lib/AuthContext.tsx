import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { login as apiLogin, register as apiRegister } from "./api";

interface User {
    id: number;
    email: string;
    name: string;
    balance: number;
}

interface AuthResult {
    ok: boolean;
    error?: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    isLoggedIn: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<AuthResult>;
    register: (name: string, email: string, password: string) => Promise<AuthResult>;
    logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem("user");
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);

    // keep localStorage in sync
    useEffect(() => {
        if (token) localStorage.setItem("token", token);
        else localStorage.removeItem("token");
    }, [token]);

    useEffect(() => {
        if (user) localStorage.setItem("user", JSON.stringify(user));
        else localStorage.removeItem("user");
    }, [user]);

    async function login(email: string, password: string): Promise<AuthResult> {
        setLoading(true);
        try {
            const data = await apiLogin(email, password);
            setToken(data.token);
            setUser(data.user);
            return { ok: true };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Login failed";
            return { ok: false, error: msg };
        } finally {
            setLoading(false);
        }
    }

    async function register(name: string, email: string, password: string): Promise<AuthResult> {
        setLoading(true);
        try {
            const data = await apiRegister(name, email, password);
            setToken(data.token);
            setUser(data.user);
            return { ok: true };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Registration failed";
            return { ok: false, error: msg };
        } finally {
            setLoading(false);
        }
    }

    function logout() {
        setToken(null);
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ token, user, isLoggedIn: !!token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}

const TOKEN_KEY = "ivote_token";
const USER_KEY = "ivote_user";

function safeStorage() {
  if (typeof window === "undefined") return null;
  try {
    window.localStorage.setItem("__ivote_test__", "1");
    window.localStorage.removeItem("__ivote_test__");
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = safeStorage();

export const getToken = () => storage?.getItem(TOKEN_KEY) ?? null;
export const setToken = (token: string) => storage?.setItem(TOKEN_KEY, token);

export const getUser = (): any | null => {
  try {
    const raw = storage?.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user: any) => {
  if (user == null) {
    storage?.removeItem(USER_KEY);
    return;
  }
  storage?.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStore = () => {
  storage?.removeItem(TOKEN_KEY);
  storage?.removeItem(USER_KEY);
};

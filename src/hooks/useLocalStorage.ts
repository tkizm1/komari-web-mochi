import { useState, useEffect, useRef } from 'react';

const readStoredValue = <T,>(key: string, fallback: T): T => {
  try {
    // 检查是否在浏览器环境
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item);
      }
    }
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
  }
  // 如果读取失败或没有存储值，返回初始值
  return fallback;
};

export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  // 初始化时尝试从 localStorage 读取值
  const [storedValue, setStoredValue] = useState<T>(() =>
    readStoredValue(key, initialValue)
  );

  useEffect(() => {
    setStoredValue(readStoredValue(key, initialValueRef.current));
  }, [key]);

  // 监听 storage 事件，以便在其他标签页更改时同步
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  // 更新存储的值
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      // 只在客户端环境下写入 localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

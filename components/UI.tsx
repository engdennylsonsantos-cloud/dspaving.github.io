import React, { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

// --- BUTTON ---
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    fullWidth?: boolean;
    icon?: React.ReactNode;
    loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    fullWidth = false,
    className = '',
    icon,
    loading = false,
    disabled,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-bold uppercase tracking-wide rounded-lg transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ripple";

    const variants = {
        primary: "bg-primary hover:bg-primary-dark text-white shadow-lg hover:shadow-orange-500/20 focus:ring-primary",
        secondary: "bg-secondary hover:bg-secondary-light text-white shadow-lg focus:ring-gray-500",
        outline: "border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary",
        ghost: "bg-transparent hover:bg-white/10 text-gray-300 hover:text-white focus:ring-gray-400",
        danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/20 focus:ring-red-500",
    };

    const sizes = "py-3 px-6 text-sm md:text-base";
    const width = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes} ${width} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <div className="spinner mr-2" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    Carregando...
                </>
            ) : (
                <>
                    {icon && <span className="mr-2">{icon}</span>}
                    {children}
                </>
            )}
        </button>
    );
};

// --- INPUT ---
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, className = '', id, ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
                    {label}
                </label>
            )}
            <input
                id={id}
                className={`block w-full rounded-lg border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-600 focus:border-primary focus:ring-primary'} bg-secondary-dark/50 py-3 px-4 text-gray-100 placeholder-gray-500 shadow-sm sm:text-sm transition-colors ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-sm text-gray-500">{helperText}</p>
            )}
        </div>
    );
};

// --- TEXTAREA ---
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, helperText, className = '', id, ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
                    {label}
                </label>
            )}
            <textarea
                id={id}
                className={`block w-full rounded-lg border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-600 focus:border-primary focus:ring-primary'} bg-secondary-dark/50 py-3 px-4 text-gray-100 placeholder-gray-500 shadow-sm sm:text-sm transition-colors resize-vertical ${className}`}
                rows={4}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-sm text-gray-500">{helperText}</p>
            )}
        </div>
    );
};

// --- SELECT ---
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, helperText, className = '', id, children, ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
                    {label}
                </label>
            )}
            <select
                id={id}
                className={`block w-full rounded-lg border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-600 focus:border-primary focus:ring-primary'} bg-secondary-dark/50 py-3 px-4 text-gray-100 shadow-sm sm:text-sm transition-colors ${className}`}
                {...props}
            >
                {children}
            </select>
            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-sm text-gray-500">{helperText}</p>
            )}
        </div>
    );
};

// --- CARD ---
interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false }) => {
    const hoverClass = hover ? 'card-interactive' : '';
    return (
        <div className={`bg-secondary-light/30 dark:bg-surface-dark backdrop-blur-md border border-gray-700 rounded-xl p-8 shadow-2xl ${hoverClass} ${className}`}>
            {children}
        </div>
    );
};

// --- BADGE ---
interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
    const variants = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        success: 'bg-green-500/10 text-green-400 border-green-500/20',
        warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        danger: 'bg-red-500/10 text-red-400 border-red-500/20',
        info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

// --- CHECKBOX ---
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: React.ReactNode;
    error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
    label,
    error,
    className = '',
    id,
    ...props
}) => {
    return (
        <div className={`flex flex-col ${className}`}>
            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        id={id}
                        type="checkbox"
                        className="w-4 h-4 border border-gray-600 rounded bg-secondary-dark focus:ring-3 focus:ring-primary/50 text-primary cursor-pointer transition-colors"
                        {...props}
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor={id} className="font-medium text-gray-300 select-none cursor-pointer">
                        {label}
                    </label>
                </div>
            </div>
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
    );
};
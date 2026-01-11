import React from 'react';

/**
 * AuthFormCard Component
 *
 * Glassmorphic card container for authentication forms.
 * Features soft shadows, backdrop blur, and navigation footer.
 *
 * Props:
 * - title: Card title (e.g., "Welcome Back")
 * - subtitle: Card subtitle (e.g., "Sign in to your account")
 * - children: Form content
 * - footerText: Footer description text
 * - footerLinkText: Footer link button text
 * - onFooterLinkClick: Footer link click handler
 */
const AuthFormCard = ({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  onFooterLinkClick,
}) => {
  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          {title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>
      </div>

      {/* Main Content (Form) */}
      <div>{children}</div>

      {/* Footer */}
      {footerText && footerLinkText && onFooterLinkClick && (
        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-3">{footerText}</p>
          <button
            onClick={onFooterLinkClick}
            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            {footerLinkText}
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthFormCard;

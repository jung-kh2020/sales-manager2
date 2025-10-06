const Card = ({ children, className = '', title, subtitle, action }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 mb-6 ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  )
}

export default Card

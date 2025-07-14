import React, { useState } from 'react';
import { useKeycloak } from '@react-keycloak/web';

const ReportPage: React.FC = () => {
  const { keycloak, initialized } = useKeycloak();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const getReport = async () => {
    if (!keycloak?.token) {
      setError('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/reports`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };



  const getUserRoles = () => {
    return keycloak?.realmAccess?.roles || [];
  };

  const logout = () => {
    keycloak.logout();
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!keycloak.authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Приложение отчетов</h1>
          <p className="text-gray-600 mb-6 text-center">Войдите в систему для доступа к отчетам</p>
          <button
            onClick={() => keycloak.login()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">Панель отчетов</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Добро пожаловать, {keycloak.tokenParsed?.preferred_username || 'Пользователь'}
              </div>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Выход
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о пользователе</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Имя пользователя:</p>
                  <p className="font-medium">{keycloak.tokenParsed?.preferred_username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email:</p>
                  <p className="font-medium">{keycloak.tokenParsed?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Роли:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {getUserRoles().map((role) => (
                      <span
                        key={role}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">Отчеты</h2>
              
              <div className="space-y-4">
                {/* Report Generation */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Отчет по использованию</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Получение отчетов на основе вашего уровня доступа.
                  </p>
                  
                  <button
                    onClick={getReport}
                    disabled={loading}
                    className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? 'Получение отчета...' : 'Получить отчет'}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  <strong>Ошибка:</strong> {error}
                </div>
              )}

              {/* Report Data Display */}
              {reportData && (
                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  <h3 className="font-medium mb-2">Данные отчета:</h3>
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(reportData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportPage;
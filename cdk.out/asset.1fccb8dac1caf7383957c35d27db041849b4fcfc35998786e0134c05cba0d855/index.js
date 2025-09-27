// Anna Logica Enterprise - Minimal Test Version

exports.handler = async (event) => {
  console.log('🧪 MINIMAL TEST - Event received:', event);

  try {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: '🎯 LAMBDA FUNCIONA CORRECTAMENTE',
        service: 'Anna Logica Minimal Test',
        timestamp: new Date().toISOString(),
        httpMethod: event.httpMethod,
        test: 'PASSED'
      })
    };

  } catch (error) {
    console.error('❌ Error en Lambda minimal:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: 'Error en test mínimo',
        error: error.message
      })
    };
  }
};
import React from 'react';

const LoginCard: React.FC = () => {
   

    const handleOAuthLogin = (provider: string) => {
        // Implement OAuth login logic here
        console.log(`Logging in with ${provider}`);
    };

    return (
        <div className="login-card">
            <h2>Login</h2>
            <div className="oauth-login">
                <button onClick={() => handleOAuthLogin('google')}>Login with Google</button>
            </div>
        </div>
    );
};

export default LoginCard;
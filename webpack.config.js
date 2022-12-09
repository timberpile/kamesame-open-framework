const path = require('path')

module.exports = {
    entry: {
        Core: './src/Core/index.ts',
        Jquery: './src/Jquery/index.ts',
        Menu: './src/Menu/index.ts',
        Settings: './src/Settings/index.ts',
        All: [
            './src/Core/index.ts',
            './src/Jquery/index.ts',
            './src/Menu/index.ts',
            './src/Settings/index.ts',
        ],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: 'none',
}

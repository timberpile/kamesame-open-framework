const path = require('path')
const { merge } = require('webpack-merge')
const WebpackUserscript = require('webpack-userscript')

const PRODUCTION = true

const customConfigs = (() => {
    const CommonUSConfig = {
        name: 'KameSame Open Framework',
        match: 'http*://*.kamesame.com/*',
        copyright: '2022+, Robin Findley, Timberpile',
        author: 'Robin Findley, Timberpile',
        namespace: 'http://kamesame.com',
        'run-at': 'document-start',
        grant: 'none',
    }

    const CoreUSConfig = { ...CommonUSConfig }
    CoreUSConfig.name = 'KameSame Open Framework'
    CoreUSConfig.description = 'Framework for writing scripts for KameSame'
    CoreUSConfig.version = '0.4'

    const JqueryUSConfig = { ...CommonUSConfig }
    JqueryUSConfig.name = 'KameSame Open Framework - Jquery module'
    JqueryUSConfig.description = 'Jquery module for KameSame Open Framework'
    JqueryUSConfig.version = '0.3'

    const MenuUSConfig = { ...CommonUSConfig }
    MenuUSConfig.name = 'KameSame Open Framework - Menu module'
    MenuUSConfig.description = 'Menu module for KameSame Open Framework'
    MenuUSConfig.version = '0.2.0.1'

    const SettingsUSConfig = { ...CommonUSConfig }
    SettingsUSConfig.name = 'KameSame Open Framework - Settings module'
    SettingsUSConfig.description = 'Settings module for KameSame Open Framework'
    SettingsUSConfig.version = '0.3'

    const AllInOneUSConfig = { ...CommonUSConfig }
    AllInOneUSConfig.name = 'KameSame Open Framework - All in One (DEV)'
    AllInOneUSConfig.description = 'KameSame framework including all modules'
    AllInOneUSConfig.version = CoreUSConfig.version

    const CoreConfig = {
        entry: {
            Core: './src/Core/index.ts',
        },
        plugins: [
            new WebpackUserscript({
                headers: CoreUSConfig,
            }),
        ],
    }

    const JqueryConfig = {
        entry: {
            Jquery: './src/Jquery/index.ts',
        },
        plugins: [
            new WebpackUserscript({
                headers: JqueryUSConfig,
            }),
        ],
    }

    const MenuConfig = {
        entry: {
            Menu: './src/Menu/index.ts',
        },
        plugins: [
            new WebpackUserscript({
                headers: MenuUSConfig,
            }),
        ],
    }

    const SettingsConfig = {
        entry: {
            Settings: './src/Settings/index.ts',
        },
        plugins: [
            new WebpackUserscript({
                headers: SettingsUSConfig,
            }),
        ],
    }

    const AllInOneConfig = {
        entry: {
            AllInOne: [
                './src/Core/index.ts',
                './src/Jquery/index.ts',
                './src/Menu/index.ts',
                './src/Settings/index.ts',
            ],
        },
        plugins: [
            new WebpackUserscript({
                headers: AllInOneUSConfig,
            }),
        ],
    }

    return [CoreConfig, JqueryConfig, MenuConfig, SettingsConfig, AllInOneConfig]
})()

const commonConfig = {
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
    mode: PRODUCTION ? 'production' : 'development',
}

const configs = (() => {
    const c = []
    for (const config of customConfigs) {
        c.push(merge(commonConfig, config))
    }
    return c
})()

module.exports = configs

module ActionDispatch::Routing
  class Mapper
    # This works exactly like *devise_for* exept that it will add
    # the Hive default options.
    def hive_for(*resources)
      options = resources.extract_options!
      defaults = {
        controllers: {
          confirmations: 'hive/confirmations',
          passwords: 'hive/passwords',
          registrations: 'hive/registrations',
          sessions: 'hive/sessions',
          omniauth_callbacks: 'hive/omniauth_callbacks'
        },
        # Added this to make the routes "/account/edit" instead of "/users/edit"
        # because the routes would clash if you setup a users resource in the host app.
        path: 'account'
      }

      devise_for *resources, defaults.deep_merge(options)
    end
  end
end

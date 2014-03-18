module Hive
  class Engine < ::Rails::Engine
    ActiveSupport.on_load(:action_controller) { helper Hive::Helpers }
    ActiveSupport.on_load(:action_controller) { include Hive::ParameterSanitizer }

    # We use to_prepare instead of after_initialize here because Devise is a
    # Rails engine and its classes are reloaded like the rest of the user's app.
    # Got to make sure that our methods are included each time.
    config.to_prepare do
      ::DeviseController.send :include, Hive::DeviseController
      ::Devise::SessionsController.send :include, Hive::SessionsController
      ::ApplicationController.send :include, Hive::Controller
    end

    # Devise is putting its devise(*modules) method on activerecord so to get
    # our hive(*modules) method to work we need to do the same.
    ActiveSupport.on_load(:active_record) { include Hive::Models }
  end
end

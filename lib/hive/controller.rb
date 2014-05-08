# Extensions for main apps ApplicationController.

module Hive
  module Controller
    extend ActiveSupport::Concern

    included do
      # When a user is not authorized to access a page a *CanCan::AccessDenied*
      # error is raised. We rescue from that error and send to user to the login
      # page if not logged in or to the home page if already logged in but not
      # allowed to access the requested page.
      rescue_from CanCan::AccessDenied do |exception|
        if user_signed_in?
          redirect_to main_app.root_url, alert: exception.message
        else
          redirect_to main_app.new_user_session_url, alert: exception.message
        end
      end
    end

    # The default url to be used after signing in.
    def after_sign_in_path_for(resource_or_scope)
      redirect_location(:after_sign_in) || super
    end

    # Method used by sessions controller to sign out a user.
    def after_sign_out_path_for(resource_or_scope)
      redirect_location(:after_sign_out) || super
    end

    # Returns the redirect location from the Hive initializer if there is one
    # configured. Otherwise returns nil.
    def redirect_location(event)
      if location = Hive.redirect_locations[event]
        if location.respond_to?(:call)
          instance_eval &location
        else
          location
        end
      end
    end

    private
      # Do not clear omniauth data when just validating the model...
      # This method is comming from DeviseEasyOmniauthable.
      def clear_omniauth?
        super && !is_a?(ValidationsController)
      end

  end
end

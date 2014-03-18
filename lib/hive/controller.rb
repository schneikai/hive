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

  end
end

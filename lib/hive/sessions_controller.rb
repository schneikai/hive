# Extensions for Devise::SessionsController.

module Hive
  module SessionsController
    extend ActiveSupport::Concern

    included do
      before_filter :store_location, only: :new
    end

    private
      # On the page that shows the login form we save the referer in the session
      # so after successful login we can redirect to that page.
      # I choose this approche over saveing the current url to the session on every request.
      # https://github.com/plataformatec/devise/wiki/How-To:-Redirect-back-to-current-page-after-sign-in,-sign-out,-sign-up,-update
      def store_location(scope='user')
        return if request.referer.blank?
        return if request.xhr? # Do nothing for ajax requests.

        referer = URI(request.referer)
        path = referer.path

        # Only save referrers from our own website.
        # Redirecting to other websites could be a security risk.
        return unless request.host == referer.host

        # Do not save the referrer if it is another Devise route.
        # Maybe:
        # new_confirmation_path(scope)
        # new_unlock_path(scope)
        return if path == new_session_path(scope) ||
          path == new_registration_path(scope) ||
          path == new_password_path(scope) ||
          path == destroy_session_path(scope)

        session["#{scope}_return_to"] = path
      end
  end
end

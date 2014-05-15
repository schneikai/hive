# Extensions for DeviseController.

module Hive
  module DeviseController
    extend ActiveSupport::Concern

    included do
      # Set the layout to use for Hive/Devise views.
      # This is configurable in the Hive initializer.
      layout :hive_layout

      alias_method_chain :devise_i18n_options, :empty_default
    end

    private
      # Returns the previous location (aka referer). This for example can be
      # used in a before filter on login or register to redirect users back where
      # they where comming fromn on success.
      #
      # For example you could add this to the DeviseSessionsController:
      #
      #   before_filter -> { store_location_for 'user', previous_location_for('user') }, only: :new
      #
      # The method will return nothing if the request is not get or it's a
      # javascript xhr request. It will return nothing if a redirect location was
      # set by the Devise failure app or the previous location was another Devise action.
      #
      # There is one catch here:
      # The location might be from a post request and there is no way of detecting
      # this so you might redirect the user to a url that only accepts post requests.
      def previous_location_for(resource_or_scope)
        location = request.referer

        return unless request.get?
        return if request.xhr?
        return if location.blank?

        # When a user tries to access a page that needs login Devise will save
        # that location and redirect to the login page. We need to make sure
        # that we don't overwrite that location here. The Devise failure app
        # will set a flash message and we use that to detect redirect locations
        # added by the failure app. But maybe we should add something more specific
        # to the failure app...
        session_key = stored_location_key_for(resource_or_scope)
        return if session[session_key].present? && flash.key?(:alert)

        # Do not return locations from other hosts than our own. Redirecting to
        # other hosts later could be a security risk.
        uri = URI(location)
        return unless request.host == uri.host

        # Do not return other Devise locations.
        return if respond_to?(:new_session_path) && uri.path == new_session_path(resource_or_scope)
        return if respond_to?(:session_path) && uri.path == session_path(resource_or_scope)
        return if respond_to?(:destroy_session_path) && uri.path == destroy_session_path(resource_or_scope)

        return if respond_to?(:registration_path) && uri.path == registration_path(resource_or_scope)
        return if respond_to?(:new_registration_path) && uri.path == new_registration_path(resource_or_scope)
        # return if respond_to?(:edit_registration_path) && uri.path == edit_registration_path(resource_or_scope)
        # return if respond_to?(:cancel_registration_path) && uri.path == cancel_registration_path(resource_or_scope)

        return if respond_to?(:confirmation_path) && uri.path == confirmation_path(resource_or_scope)
        return if respond_to?(:new_confirmation_path) && uri.path == new_confirmation_path(resource_or_scope)

        return if respond_to?(:password_path) && uri.path == password_path(resource_or_scope)
        return if respond_to?(:new_password_path) && uri.path == new_password_path(resource_or_scope)
        return if respond_to?(:edit_password_path) && uri.path == edit_password_path(resource_or_scope)

        return if respond_to?(:unlock_path) && uri.path == unlock_path(resource_or_scope)
        return if respond_to?(:new_unlock_path) && uri.path == new_unlock_path(resource_or_scope)

        location
      end

      # Allow to remove flash messages by adding empty translations to the
      # locale file. For example if you don't want to show a flash message after
      # successful sign-in you would add the following to your locale file:
      #
      #   en:
      #     devise:
      #       sessions:
      #         signed_in:
      #
      def devise_i18n_options_with_empty_default(options)
        options[:default] << ''
        options
      end

      # I wanted to have all views under the Hive namespace and not under Devise.
      # I do this be prepending a new template path to the *prefixes* option Rails
      # uses to find the template. So if a template is present in *hive/[controller_name]*
      # i.e: "hive/registrations" Rails will load the template from there instead of
      # "devise/registrations".
      def _process_options options
        options[:prefixes].unshift "hive/#{controller_name}"
        super options
      end

      def hive_layout
        if Hive.layout.is_a?(Hash)
          layout = Hive.layout.fetch(controller_name, {}).fetch(action_name, Hive.layout['default'])
        else
          layout = Hive.layout
        end
        layout
      end
  end
end

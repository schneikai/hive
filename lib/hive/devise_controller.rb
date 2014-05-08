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
